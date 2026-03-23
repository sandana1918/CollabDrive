import crypto from "crypto";
import { File } from "../models/File.js";

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

export const createShareToken = () => crypto.randomBytes(16).toString("hex");

export const isFavoriteForUser = (file, userId, key) => {
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return false;
  return (file[key] || []).some((entry) => normalizeId(entry) === normalizedUserId);
};

export const getFileAccess = (file, userId, linkToken = null) => {
  const userIdString = normalizeId(userId);
  const ownerId = normalizeId(file.owner);

  if (ownerId && userIdString && ownerId === userIdString) {
    return "owner";
  }

  const shared = file.sharedWith.find((entry) => normalizeId(entry.user) === userIdString);
  if (shared?.role) {
    return shared.role;
  }

  if (file.visibility === "public") {
    return "viewer";
  }

  if ((file.visibility === "link" || file.linkShare?.enabled) && linkToken && file.linkShare.token === linkToken) {
    if (!userIdString) {
      return "viewer";
    }

    return file.linkShare.role || "viewer";
  }

  return null;
};

export const ensureFileAccess = async (
  fileId,
  userId,
  acceptedRoles = ["owner", "editor", "commenter", "viewer"],
  options = {}
) => {
  const { includeTrashed = false, linkToken = null } = options;

  const query = includeTrashed ? { _id: fileId } : { _id: fileId, isTrashed: false };

  const file = await File.findOne(query)
    .populate("owner", "name email username avatarColor")
    .populate("sharedWith.user", "name email username avatarColor")
    .populate("comments.user", "name email username avatarColor")
    .populate("activity.actor", "name username avatarColor")
    .populate("parent", "filename parent");

  if (!file) {
    return { file: null, access: null };
  }

  const access = getFileAccess(file, userId, linkToken);

  if (!access || !acceptedRoles.includes(access)) {
    return { file, access: null };
  }

  return { file, access };
};

export const buildBreadcrumbs = async (parentId) => {
  const trail = [];
  let currentId = parentId;

  while (currentId) {
    const current = await File.findById(currentId).select("filename parent");
    if (!current) break;
    trail.unshift({ id: current._id, filename: current.filename });
    currentId = current.parent;
  }

  return trail;
};

export const collectDescendantIds = async (rootId) => {
  const descendants = [];
  const queue = [rootId];

  while (queue.length) {
    const currentParent = queue.shift();
    const children = await File.find({ parent: currentParent }).select("_id category");
    for (const child of children) {
      const childId = normalizeId(child._id);
      descendants.push(childId);
      if (child.category === "folder") {
        queue.push(childId);
      }
    }
  }

  return descendants;
};

export const isDescendantOf = async (fileId, possibleParentId) => {
  if (!fileId || !possibleParentId) return false;
  const descendants = await collectDescendantIds(fileId);
  return descendants.includes(normalizeId(possibleParentId));
};

export { normalizeId };
