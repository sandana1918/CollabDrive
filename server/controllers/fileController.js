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
    .populate("activity.actor", "name username")
    .populate("parent", "filename parent");

const buildFileResponse = (file, currentUserId, linkToken = null) => {
  const accessRole = getFileAccess(file, currentUserId, linkToken);
  const previewText = file.category === "document"
    ? file.documentFormat === "richtext"
      ? stripHtml(file.content).slice(0, 220)
      : file.content.slice(0, 220)
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
    accessRole,
    visibility: file.visibility,
    linkShare: file.linkShare,
    isStarred: isFavoriteForUser(file, currentUserId, "starredBy"),
    isPinned: isFavoriteForUser(file, currentUserId, "pinnedBy"),
    isTrashed: file.isTrashed,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    lastOpenedAt: file.lastOpenedAt,
    contentPreview: previewText,
    preview: file.preview?.url ? file.preview : resolvePreview(file),
    activity: file.activity
  };
};

const sortFilesForUser = (files, userId, section) => files.sort((a, b) => {
  const aPinned = isFavoriteForUser(a, userId, "pinnedBy") ? 1 : 0;
  const bPinned = isFavoriteForUser(b, userId, "pinnedBy") ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;
  if (section === "recent") return new Date(b.lastOpenedAt || b.updatedAt) - new Date(a.lastOpenedAt || a.updatedAt);
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return new Date(b.updatedAt) - new Date(a.updatedAt);
});

const collectTreeIds = async (fileId) => [normalizeId(fileId), ...(await collectDescendantIds(fileId))];

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

  let files = await populateFile(File.find(filter).limit(250));

  if (starred === "true") {
    files = files.filter((file) => isFavoriteForUser(file, userId, "starredBy"));
  }

  files = sortFilesForUser(files, userId, section);
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
  await file.save();

  const versions = await DocumentVersion.find({ file: file._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("editedBy", "name username");
  const breadcrumbs = file.parent ? await buildBreadcrumbs(file.parent._id || file.parent) : [];

  res.json({
    success: true,
    file: buildFileResponse(file, userId, linkToken),
    content: file.content,
    versions,
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

export const toggleFavorite = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id);
  if (!file || !access) throw new AppError("Access denied.", 403);

  const isPin = req.params.kind === "pin";
  const key = isPin ? "pinnedBy" : "starredBy";
  const userId = normalizeId(req.user._id);
  const current = (file[key] || []).map((entry) => normalizeId(entry));

  if (current.includes(userId)) {
    file[key] = current.filter((entry) => entry !== userId);
  } else {
    file[key] = [...current, userId];
  }

  appendActivity(file, req.user._id, `${current.includes(userId) ? "removed" : "enabled"} ${isPin ? "pin" : "star"}`);
  await file.save();

  const updated = await populateFile(File.findById(file._id));
  res.json({ success: true, file: buildFileResponse(updated, req.user._id) });
});

export const trashFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"]);
  if (!file || !access) throw new AppError("You do not have permission to trash this item.", 403);

  const ids = await collectTreeIds(file._id);
  await File.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isTrashed: true,
        trashedAt: new Date(),
        trashedBy: req.user._id
      }
    }
  );

  appendActivity(file, req.user._id, file.category === "folder" ? "moved folder tree to trash" : "moved item to trash");
  await file.save();

  await notifyUsers(
    file.sharedWith.map((entry) => entry.user._id || entry.user),
    { type: "trash", title: "Item moved to trash", message: `${file.filename} was moved to trash`, file: file._id }
  );

  res.json({ success: true, message: "Item moved to trash." });
});

export const restoreFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner", "editor"], { includeTrashed: true });
  if (!file || !access) throw new AppError("You do not have permission to restore this item.", 403);

  const ids = await collectTreeIds(file._id);
  await File.updateMany(
    { _id: { $in: ids } },
    {
      $set: { isTrashed: false },
      $unset: { trashedAt: 1, trashedBy: 1 }
    }
  );

  appendActivity(file, req.user._id, file.category === "folder" ? "restored folder tree" : "restored item from trash");
  await file.save();

  await notifyUsers(
    file.sharedWith.map((entry) => entry.user._id || entry.user),
    { type: "restore", title: "Item restored", message: `${file.filename} was restored`, file: file._id }
  );

  res.json({ success: true, message: "Item restored." });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner"], { includeTrashed: true });
  if (!file || !access) throw new AppError("Only the owner can delete this file.", 403);

  const ids = await collectTreeIds(file._id);
  const allFiles = await File.find({ _id: { $in: ids } }).select("storageKey");

  await Promise.all(
    allFiles
      .filter((entry) => entry.storageKey)
      .map((entry) => storageConfig.removeFile(entry.storageKey).catch(() => null))
  );

  await DocumentVersion.deleteMany({ file: { $in: ids } });
  await File.deleteMany({ _id: { $in: ids } });

  res.json({ success: true, message: "File deleted permanently." });
});

export const getActivityFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const files = await populateFile(
    File.find({ $or: [{ owner: userId }, { "sharedWith.user": userId }], activity: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 })
      .limit(40)
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
    .slice(0, 40);

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
