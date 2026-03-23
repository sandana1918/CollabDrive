import path from "path";
import { v4 as uuidv4 } from "uuid";
import { File } from "../models/File.js";
import { DocumentVersion } from "../models/DocumentVersion.js";
import { storageConfig } from "../config/storage.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { appendActivity } from "../services/activityService.js";
import {
  buildBreadcrumbs,
  collectDescendantIds,
  ensureFileAccess,
  getFileAccess,
  isDescendantOf,
  isFavoriteForUser,
  normalizeId
} from "../utils/fileAccess.js";
import { notifyUsers } from "../services/notificationService.js";

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const uniqueIds = (values = []) => [...new Set(values.filter(Boolean).map((value) => normalizeId(value)))];
const formatComment = (comment) => ({
  id: comment._id,
  user: comment.user,
  message: comment.message,
  anchorText: comment.anchorText,
  resolved: comment.resolved,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt
});

const resolvePreview = (file) => {
  if (file.category !== "file") return { kind: "none", url: null };
  if (file.mimeType?.startsWith("image/")) {
    return { kind: "image", url: `/api/files/${file._id}/download` };
  }
  if (file.mimeType === "application/pdf") {
    return { kind: "pdf", url: `/api/files/${file._id}/download` };
  }
  return { kind: "none", url: null };
};

const populateFile = (query) =>
  query
    .populate("owner", "name email username avatarColor")
    .populate("sharedWith.user", "name email username avatarColor")
    .populate("comments.user", "name email username avatarColor")
    .populate("activity.actor", "name username avatarColor")
    .populate("parent", "filename parent");

const getLatestActor = (file) => {
  const latestActivity = (file.activity || []).find((entry) => entry.actor);
  return latestActivity?.actor || null;
};

const getAccessSummary = (file) => {
  if (file.visibility === "public") return "Public";
  if (file.linkShare?.enabled) return "Link";
  if ((file.sharedWith || []).length) return `Shared with ${(file.sharedWith || []).length}`;
  return "Private";
};

const buildFileResponse = (file, currentUserId, linkToken = null) => {
  const accessRole = getFileAccess(file, currentUserId, linkToken);
  const previewText = file.category === "document"
    ? file.documentFormat === "richtext"
      ? stripHtml(file.content).slice(0, 260)
      : (file.content || "").slice(0, 260)
    : "";

  return {
    id: file._id,
    filename: file.filename,
    originalName: file.originalName,
    category: file.category,
    documentFormat: file.documentFormat,
    mimeType: file.mimeType,
    size: file.size,
    owner: file.owner,
    parent: file.parent,
    sharedWith: file.sharedWith,
    sharedCount: file.sharedWith?.length || 0,
    collaborators: [file.owner, ...(file.sharedWith || []).map((entry) => entry.user)].filter(Boolean),
    accessRole,
    accessSummary: getAccessSummary(file),
    visibility: file.visibility,
    linkShare: file.linkShare,
    isStarred: isFavoriteForUser(file, currentUserId, "starredBy"),
    isPinned: isFavoriteForUser(file, currentUserId, "pinnedBy"),
    isTrashed: file.isTrashed,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    lastOpenedAt: file.lastOpenedAt,
    lastEditedBy: getLatestActor(file),
    contentPreview: previewText,
    preview: file.preview?.url ? file.preview : resolvePreview(file),
    commentsCount: file.comments?.length || 0,
    comments: (file.comments || []).map(formatComment),
    activity: file.activity
  };
};

const scoreSearchHit = (file, searchTerm = "") => {
  if (!searchTerm) return 0;
  const term = searchTerm.toLowerCase().trim();
  const filename = (file.filename || "").toLowerCase();
  const originalName = (file.originalName || "").toLowerCase();
  const content = stripHtml(file.content || "").toLowerCase();

  let score = 0;
  if (filename === term) score += 120;
  if (filename.startsWith(term)) score += 90;
  if (filename.includes(term)) score += 65;
  if (originalName.startsWith(term)) score += 40;
  if (originalName.includes(term)) score += 25;
  if (content.includes(term)) score += 20;
  if (file.category === "folder" && filename.includes(term)) score += 10;
  return score;
};

const sortFilesForUser = (files, userId, section, searchTerm = "") => files.sort((a, b) => {
  const aPinned = isFavoriteForUser(a, userId, "pinnedBy") ? 1 : 0;
  const bPinned = isFavoriteForUser(b, userId, "pinnedBy") ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;

  const aScore = scoreSearchHit(a, searchTerm);
  const bScore = scoreSearchHit(b, searchTerm);
  if (aScore !== bScore) return bScore - aScore;

  if (section === "recent") return new Date(b.lastOpenedAt || b.updatedAt) - new Date(a.lastOpenedAt || a.updatedAt);
  if (a.category !== b.category) return a.category === "folder" ? -1 : 1;
  return new Date(b.updatedAt) - new Date(a.updatedAt);
});

const collectTreeIds = async (fileId) => [normalizeId(fileId), ...(await collectDescendantIds(fileId))];

const updateFavoriteState = (file, key, userId, desired = null) => {
  const normalizedUserId = normalizeId(userId);
  const current = uniqueIds(file[key] || []);
  const has = current.includes(normalizedUserId);
  const nextEnabled = desired === null ? !has : desired;
  file[key] = nextEnabled
    ? uniqueIds([...current, normalizedUserId])
    : current.filter((entry) => entry !== normalizedUserId);
  return nextEnabled;
};

const trashTree = async (file, actorId) => {
  const ids = await collectTreeIds(file._id);
  await File.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isTrashed: true,
        trashedAt: new Date(),
        trashedBy: actorId
      }
    }
  );

  file.isTrashed = true;
  file.trashedAt = new Date();
  file.trashedBy = actorId;
  file.trashedParent = file.parent || null;
  file.parent = null;
  appendActivity(file, actorId, file.category === "folder" ? "moved folder tree to trash" : "moved item to trash");
  await file.save();
  return ids;
};

const restoreTree = async (file, actorId) => {
  const ids = await collectTreeIds(file._id);
  await File.updateMany(
    { _id: { $in: ids } },
    {
      $set: { isTrashed: false },
      $unset: { trashedAt: 1, trashedBy: 1 }
    }
  );

  file.isTrashed = false;
  file.parent = file.trashedParent || null;
  file.trashedParent = null;
  file.trashedAt = undefined;
  file.trashedBy = undefined;
  appendActivity(file, actorId, file.category === "folder" ? "restored folder tree" : "restored item from trash");
  await file.save();
  return ids;
};

const permanentDeleteTree = async (file) => {
  const ids = await collectTreeIds(file._id);
  const allFiles = await File.find({ _id: { $in: ids } }).select("storageKey");

  await Promise.all(
    allFiles
      .filter((entry) => entry.storageKey)
      .map((entry) => storageConfig.removeFile(entry.storageKey).catch(() => null))
  );

  await DocumentVersion.deleteMany({ file: { $in: ids } });
  await File.deleteMany({ _id: { $in: ids } });
  return ids;
};

export const listFiles = asyncHandler(async (req, res) => {
  const {
    section = "all",
    search = "",
    parentId = null,
    includeTrashed = "false",
    starred = "false"
  } = req.query;

  const userId = req.user._id;
  const trashed = includeTrashed === "true";
  const searchRegex = search ? new RegExp(search, "i") : null;

  const filter = {
    $or: [{ owner: userId }, { "sharedWith.user": userId }, { visibility: "public" }],
    isTrashed: trashed
  };

  if (section === "my-files") {
    filter.owner = userId;
    delete filter.$or;
  }

  if (section === "shared") {
    filter["sharedWith.user"] = userId;
    delete filter.$or;
  }

  if (section === "recent") {
    filter.$or = [{ owner: userId }, { "sharedWith.user": userId }];
  }

  if (parentId === "root") {
    filter.parent = null;
  } else if (parentId) {
    filter.parent = parentId;
  }

  if (searchRegex) {
    filter.$and = [{ $or: [{ filename: searchRegex }, { originalName: searchRegex }, { content: searchRegex }] }];
  }

  let files = await populateFile(File.find(filter).limit(300));

  if (starred === "true") {
    files = files.filter((file) => isFavoriteForUser(file, userId, "starredBy"));
  }

  files = sortFilesForUser(files, userId, section, search);
  const breadcrumbs = parentId && parentId !== "root" ? await buildBreadcrumbs(parentId) : [];

  res.json({
    success: true,
    files: files.map((file) => buildFileResponse(file, userId)),
    breadcrumbs,
    stats: {
      total: files.length,
      folders: files.filter((file) => file.category === "folder").length,
      documents: files.filter((file) => file.category === "document").length
    }
  });
});

export const createFolder = asyncHandler(async (req, res) => {
  const { filename, parent = null } = req.body;

  if (!filename?.trim()) {
    throw new AppError("Folder name is required.", 400);
  }

  if (parent) {
    const { file: parentFile, access } = await ensureFileAccess(parent, req.user._id, ["owner", "editor"]);
    if (!parentFile || !access || parentFile.category !== "folder") {
      throw new AppError("Invalid parent folder.", 400);
    }
  }

  const file = await File.create({
    filename: filename.trim(),
    originalName: filename.trim(),
    category: "folder",
    owner: req.user._id,
    parent,
    mimeType: "application/vnd.collabdrive.folder"
  });

  appendActivity(file, req.user._id, "created folder");
  await file.save();

  const populated = await populateFile(File.findById(file._id));
  res.status(201).json({ success: true, file: buildFileResponse(populated, req.user._id) });
});

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file uploaded.", 400);
  }

  const parent = req.body.parent || null;
  if (parent) {
    const { file: parentFile, access } = await ensureFileAccess(parent, req.user._id, ["owner", "editor"]);
    if (!parentFile || !access || parentFile.category !== "folder") {
      throw new AppError("Invalid parent folder.", 400);
    }
  }

  const generatedName = `${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}`;
  const uploadResult =
    storageConfig.provider === "s3"
      ? await storageConfig.uploadS3({ ...req.file, generatedName })
      : await storageConfig.uploadLocal({ ...req.file, generatedName });

  let file = await File.create({
    filename: req.body.filename?.trim() || req.file.originalname,
    originalName: req.file.originalname,
    category: "file",
    documentFormat: "binary",
    mimeType: req.file.mimetype,
    size: req.file.size,
    owner: req.user._id,
    parent,
    storageKey: uploadResult.storageKey,
    storageProvider: storageConfig.provider,
    preview: resolvePreview({ category: "file", mimeType: req.file.mimetype, _id: null })
  });

  appendActivity(file, req.user._id, "uploaded file");
  await file.save();
  file = await populateFile(File.findById(file._id));

  res.status(201).json({ success: true, file: buildFileResponse(file, req.user._id) });
});

export const createDocument = asyncHandler(async (req, res) => {
  const { filename, content, documentFormat = "richtext", parent = null } = req.body;

  if (!filename?.trim()) {
    throw new AppError("Document name is required.", 400);
  }

  if (parent) {
    const { file: parentFile, access } = await ensureFileAccess(parent, req.user._id, ["owner", "editor"]);
    if (!parentFile || !access || parentFile.category !== "folder") {
      throw new AppError("Invalid parent folder.", 400);
    }
  }

  const initialContent = content ?? (documentFormat === "richtext" ? "<p><br></p>" : "");
  const mimeTypeMap = { richtext: "text/html", markdown: "text/markdown", plain: "text/plain" };

  let file = await File.create({
    filename: filename.trim(),
    originalName: filename.trim(),
    category: "document",
    documentFormat,
    mimeType: mimeTypeMap[documentFormat] || "text/plain",
    owner: req.user._id,
    parent,
    content: initialContent
  });

  appendActivity(file, req.user._id, "created document");
  await file.save();
  await DocumentVersion.create({ file: file._id, content: initialContent, editedBy: req.user._id });
  file = await populateFile(File.findById(file._id));

  res.status(201).json({ success: true, file: buildFileResponse(file, req.user._id) });
});

export const getDocumentContent = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const linkToken = req.query.linkToken || null;
  const { file, access } = await ensureFileAccess(req.params.id, userId, ["owner", "editor", "commenter", "viewer"], {
    includeTrashed: false,
    linkToken
  });

  if (!file || !access) {
    throw new AppError("You do not have access to this file.", 403);
  }

  file.lastOpenedAt = new Date();
  appendActivity(file, userId || file.owner?._id || file.owner, "opened document");
  await file.save();

  const versions = await DocumentVersion.find({ file: file._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("editedBy", "name username avatarColor");
  const breadcrumbs = file.parent ? await buildBreadcrumbs(file.parent._id || file.parent) : [];

  res.json({
    success: true,
    file: buildFileResponse(file, userId, linkToken),
    content: file.content,
    versions,
    comments: (file.comments || []).map(formatComment),
    breadcrumbs
  });
});

export const updateDocumentContent = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"]);
  if (!file || !access) {
    throw new AppError("You do not have permission to edit this document.", 403);
  }

  const { content = "" } = req.body;
  file.content = content;
  file.lastOpenedAt = new Date();
  appendActivity(file, req.user._id, "updated document");
  await file.save();

  await DocumentVersion.create({ file: file._id, content, editedBy: req.user._id });
  await notifyUsers(
    file.sharedWith.filter((entry) => ["editor", "commenter", "viewer"].includes(entry.role)).map((entry) => entry.user._id || entry.user),
    {
      type: "edit",
      title: "Document updated",
      message: `${req.user.name} edited ${file.filename}`,
      file: file._id
    }
  );

  res.json({ success: true, message: "Document saved.", updatedAt: file.updatedAt });
});

export const renameFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"]);
  if (!file || !access) {
    throw new AppError("You do not have permission to rename this item.", 403);
  }

  const filename = req.body.filename?.trim();
  if (!filename) {
    throw new AppError("A name is required.", 400);
  }

  file.filename = filename;
  if (file.category !== "file") {
    file.originalName = filename;
  }
  appendActivity(file, req.user._id, "renamed item", { filename });
  await file.save();

  const updated = await populateFile(File.findById(file._id));
  res.json({ success: true, file: buildFileResponse(updated, req.user._id) });
});

export const moveFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"]);
  if (!file || !access) {
    throw new AppError("You do not have permission to move this item.", 403);
  }

  const { parent = null } = req.body;
  const fileId = normalizeId(file._id);
  const normalizedParent = normalizeId(parent);

  if (normalizedParent && normalizedParent === fileId) {
    throw new AppError("An item cannot be moved into itself.", 400);
  }

  if (file.category === "folder" && normalizedParent && await isDescendantOf(fileId, normalizedParent)) {
    throw new AppError("A folder cannot be moved into one of its descendants.", 400);
  }

  if (parent) {
    const { file: targetParent, access: parentAccess } = await ensureFileAccess(parent, req.user._id, ["owner", "editor"]);
    if (!targetParent || !parentAccess || targetParent.category !== "folder") {
      throw new AppError("Invalid destination folder.", 400);
    }
  }

  file.parent = parent;
  appendActivity(file, req.user._id, "moved item", { parent });
  await file.save();

  const updated = await populateFile(File.findById(file._id));
  res.json({ success: true, file: buildFileResponse(updated, req.user._id) });
});

export const bulkFileAction = asyncHandler(async (req, res) => {
  const { ids = [], action, destinationId = null } = req.body;
  const fileIds = uniqueIds(ids);

  if (!fileIds.length) {
    throw new AppError("Select at least one item.", 400);
  }

  if (!action) {
    throw new AppError("Bulk action is required.", 400);
  }

  const results = [];

  for (const fileId of fileIds) {
    const acceptedRoles = action === "delete" ? ["owner"] : ["owner", "editor"];
    const { file, access } = await ensureFileAccess(fileId, req.user._id, acceptedRoles, {
      includeTrashed: action === "restore" || action === "delete"
    });

    if (!file || !access) continue;

    if (action === "trash") {
      await trashTree(file, req.user._id);
      results.push({ id: fileId, status: "trashed" });
      continue;
    }

    if (action === "restore") {
      await restoreTree(file, req.user._id);
      results.push({ id: fileId, status: "restored" });
      continue;
    }

    if (action === "delete") {
      await permanentDeleteTree(file);
      results.push({ id: fileId, status: "deleted" });
      continue;
    }

    if (action === "move") {
      const normalizedDestination = normalizeId(destinationId);
      if (normalizedDestination && normalizedDestination === normalizeId(file._id)) {
        continue;
      }
      if (file.category === "folder" && normalizedDestination && await isDescendantOf(file._id, normalizedDestination)) {
        continue;
      }
      if (destinationId) {
        const { file: targetParent, access: parentAccess } = await ensureFileAccess(destinationId, req.user._id, ["owner", "editor"]);
        if (!targetParent || !parentAccess || targetParent.category !== "folder") continue;
      }
      file.parent = destinationId || null;
      appendActivity(file, req.user._id, "moved item", { parent: destinationId || null, bulk: true });
      await file.save();
      results.push({ id: fileId, status: "moved" });
      continue;
    }

    if (["star", "unstar", "pin", "unpin"].includes(action)) {
      const key = action.includes("pin") ? "pinnedBy" : "starredBy";
      const enabled = !action.startsWith("un");
      updateFavoriteState(file, key, req.user._id, enabled);
      appendActivity(file, req.user._id, `${enabled ? "enabled" : "removed"} ${action.includes("pin") ? "pin" : "star"}`, { bulk: true });
      await file.save();
      results.push({ id: fileId, status: action });
    }
  }

  res.json({ success: true, results, processed: results.length });
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id);
  if (!file || !access) throw new AppError("Access denied.", 403);

  const isPin = req.params.kind === "pin";
  const key = isPin ? "pinnedBy" : "starredBy";
  const enabled = updateFavoriteState(file, key, req.user._id);

  appendActivity(file, req.user._id, `${enabled ? "enabled" : "removed"} ${isPin ? "pin" : "star"}`);
  await file.save();

  const updated = await populateFile(File.findById(file._id));
  res.json({ success: true, file: buildFileResponse(updated, req.user._id) });
});

export const trashFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"]);
  if (!file || !access) throw new AppError("You do not have permission to trash this item.", 403);

  await trashTree(file, req.user._id);
  await notifyUsers(
    file.sharedWith.map((entry) => entry.user._id || entry.user),
    { type: "trash", title: "Item moved to trash", message: `${file.filename} was moved to trash`, file: file._id }
  );

  res.json({ success: true, message: "Item moved to trash." });
});

export const restoreFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"], { includeTrashed: true });
  if (!file || !access) throw new AppError("You do not have permission to restore this item.", 403);

  await restoreTree(file, req.user._id);
  await notifyUsers(
    file.sharedWith.map((entry) => entry.user._id || entry.user),
    { type: "restore", title: "Item restored", message: `${file.filename} was restored`, file: file._id }
  );

  res.json({ success: true, message: "Item restored to its original location." });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner"], { includeTrashed: true });
  if (!file || !access) throw new AppError("Only the owner can delete this file.", 403);

  await permanentDeleteTree(file);
  res.json({ success: true, message: "Item deleted permanently." });
});

export const addComment = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor", "commenter"]);
  if (!file || !access) throw new AppError("You do not have permission to comment on this file.", 403);

  const message = req.body.message?.trim();
  const anchorText = req.body.anchorText?.trim() || "";

  if (!message) throw new AppError("Comment message is required.", 400);

  file.comments.unshift({
    user: req.user._id,
    message,
    anchorText,
    resolved: false
  });
  appendActivity(file, req.user._id, "added comment", { anchorText });
  await file.save();

  const updated = await populateFile(File.findById(file._id));
  await notifyUsers(
    updated.sharedWith.map((entry) => entry.user._id || entry.user),
    { type: "comment", title: "New comment", message: `${req.user.name} commented on ${updated.filename}`, file: updated._id }
  );

  res.status(201).json({ success: true, comments: (updated.comments || []).map(formatComment) });
});

export const resolveComment = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor", "commenter"]);
  if (!file || !access) throw new AppError("You do not have permission to update comments on this file.", 403);

  const comment = file.comments.id(req.params.commentId);
  if (!comment) throw new AppError("Comment not found.", 404);

  comment.resolved = req.body.resolved ?? true;
  appendActivity(file, req.user._id, comment.resolved ? "resolved comment" : "reopened comment");
  await file.save();

  const updated = await populateFile(File.findById(file._id));
  res.json({ success: true, comments: (updated.comments || []).map(formatComment) });
});

export const restoreDocumentVersion = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"]);
  if (!file || !access) throw new AppError("You do not have permission to restore versions for this document.", 403);

  const version = await DocumentVersion.findOne({ _id: req.params.versionId, file: file._id });
  if (!version) throw new AppError("Version not found.", 404);

  file.content = version.content;
  file.lastOpenedAt = new Date();
  appendActivity(file, req.user._id, "restored version", { versionId: version._id });
  await file.save();
  await DocumentVersion.create({ file: file._id, content: version.content, editedBy: req.user._id });

  res.json({ success: true, content: version.content, updatedAt: file.updatedAt });
});

export const getActivityFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const files = await populateFile(
    File.find({ $or: [{ owner: userId }, { "sharedWith.user": userId }], activity: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 })
      .limit(50)
  );

  const activity = files
    .flatMap((file) =>
      (file.activity || []).map((entry) => ({
        id: `${file._id}-${entry.createdAt?.toISOString?.() || Math.random()}`,
        file: { id: file._id, filename: file.filename, category: file.category },
        action: entry.action,
        actor: entry.actor,
        createdAt: entry.createdAt,
        metadata: entry.metadata || {}
      }))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);

  res.json({ success: true, activity });
});

export const downloadFile = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const linkToken = req.query.linkToken || null;
  const { file, access } = await ensureFileAccess(req.params.id, userId, ["owner", "editor", "commenter", "viewer"], {
    includeTrashed: false,
    linkToken
  });

  if (!file || !access) throw new AppError("You do not have access to this file.", 403);

  if (file.category === "document") {
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.send(file.content);
    return;
  }

  const stream = await storageConfig.getDownloadStream(file.storageKey);
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
  stream.pipe(res);
});
