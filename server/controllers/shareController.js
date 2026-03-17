import { File } from "../models/File.js";
import { User } from "../models/User.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { ensureFileAccess, createShareToken } from "../utils/fileAccess.js";
import { appendActivity } from "../services/activityService.js";
import { createNotification } from "../services/notificationService.js";

const populateFile = (id) =>
  File.findById(id)
    .populate("owner", "name email username avatarColor")
    .populate("sharedWith.user", "name email username avatarColor")
    .populate("activity.actor", "name username")
    .populate("parent", "filename parent");

export const shareFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner"]);
  if (!file || !access) throw new AppError("Only the owner can share this file.", 403);

  const { identifier, role } = req.body;
  if (!identifier || !role) throw new AppError("A target user and role are required.", 400);
  if (!["editor", "commenter", "viewer"].includes(role)) throw new AppError("Invalid share role.", 400);

  const normalized = identifier.toLowerCase();
  const target = await User.findOne({ $or: [{ email: normalized }, { username: normalized }] }).select("_id name email username avatarColor");
  if (!target) throw new AppError("User not found.", 404);
  if (target._id.toString() === req.user._id.toString()) throw new AppError("You already own this file.", 400);

  const existing = file.sharedWith.find((entry) => entry.user.toString() === target._id.toString());
  if (existing) existing.role = role;
  else file.sharedWith.push({ user: target._id, role });

  appendActivity(file, req.user._id, `shared file with ${target.username} as ${role}`);
  await file.save();

  await createNotification({
    user: target._id,
    type: "share",
    title: "A file was shared with you",
    message: `${req.user.name} shared ${file.filename} with you as ${role}.`,
    file: file._id
  });

  const updatedFile = await populateFile(file._id);
  res.json({ success: true, message: "File shared successfully.", file: updatedFile });
});

export const updateSharingSettings = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner"]);
  if (!file || !access) throw new AppError("Only the owner can update sharing settings.", 403);

  const { visibility, linkEnabled, linkRole } = req.body;
  if (visibility && !["private", "link", "public"].includes(visibility)) {
    throw new AppError("Invalid visibility.", 400);
  }

  if (visibility) file.visibility = visibility;
  if (typeof linkEnabled === "boolean") file.linkShare.enabled = linkEnabled;
  if (linkRole && ["viewer", "commenter", "editor"].includes(linkRole)) file.linkShare.role = linkRole;

  if (file.visibility === "link") {
    file.linkShare.enabled = true;
  }

  if (file.linkShare.enabled && !file.linkShare.token) {
    file.linkShare.token = createShareToken();
  }

  if (!file.linkShare.enabled && file.visibility !== "link") {
    file.linkShare.token = undefined;
  }

  appendActivity(file, req.user._id, "updated sharing settings", { visibility: file.visibility, linkShare: file.linkShare });
  await file.save();

  const updatedFile = await populateFile(file._id);
  res.json({ success: true, file: updatedFile });
});

export const revokeAllAccess = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner"]);
  if (!file || !access) throw new AppError("Only the owner can revoke all access.", 403);

  file.sharedWith = [];
  file.visibility = "private";
  file.linkShare.enabled = false;
  file.linkShare.token = undefined;
  appendActivity(file, req.user._id, "revoked all shared access");
  await file.save();

  const updatedFile = await populateFile(file._id);
  res.json({ success: true, message: "All shared access revoked.", file: updatedFile });
});

export const unshareFile = asyncHandler(async (req, res) => {
  const { file, access } = await ensureFileAccess(req.params.id, req.user._id, ["owner"]);
  if (!file || !access) throw new AppError("Only the owner can update sharing.", 403);

  const { userId } = req.params;
  file.sharedWith = file.sharedWith.filter((entry) => entry.user.toString() !== userId);
  appendActivity(file, req.user._id, "removed shared access");
  await file.save();

  res.json({ success: true, message: "Shared access removed." });
});
