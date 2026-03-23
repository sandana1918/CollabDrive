import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { signToken } from "../utils/jwt.js";
import { buildAvatarSeed, generateAvatarColor } from "../utils/avatarColor.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  avatarColor: user.avatarColor,
  preferences: user.preferences,
  createdAt: user.createdAt
});

const syncAvatarColor = async (user) => {
  const nextColor = generateAvatarColor(buildAvatarSeed(user));
  if (user.avatarColor !== nextColor) {
    user.avatarColor = nextColor;
    await user.save();
  }
  return user;
};

export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    throw new AppError("All fields are required.", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long.", 400);
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  });

  if (existingUser) {
    throw new AppError("Email or username is already in use.", 409);
  }

  const normalizedUsername = username.toLowerCase();
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    avatarColor: generateAvatarColor(`${normalizedUsername}:${normalizedEmail}`)
  });

  const token = signToken({ userId: user._id });

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user)
  });
});

export const login = asyncHandler(async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    throw new AppError("Email/username and password are required.", 400);
  }

  const identifier = emailOrUsername.toLowerCase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!user) {
    throw new AppError("Invalid credentials.", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid credentials.", 401);
  }

  await syncAvatarColor(user);

  const token = signToken({ userId: user._id });

  res.json({
    success: true,
    token,
    user: sanitizeUser(user)
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  await syncAvatarColor(req.user);
  const unreadNotifications = await Notification.countDocuments({ user: req.user._id, isRead: false });

  res.json({
    success: true,
    user: {
      ...sanitizeUser(req.user),
      unreadNotifications
    }
  });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const { viewMode, density, theme } = req.body;

  if (viewMode) req.user.preferences.viewMode = viewMode;
  if (density) req.user.preferences.density = density;
  if (theme) req.user.preferences.theme = theme;

  await req.user.save();

  res.json({
    success: true,
    preferences: req.user.preferences,
    user: sanitizeUser(req.user)
  });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate("file", "filename category")
    .lean();

  res.json({
    success: true,
    notifications
  });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });

  res.json({
    success: true,
    message: "Notifications marked as read."
  });
});
