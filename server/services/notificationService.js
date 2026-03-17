import { Notification } from "../models/Notification.js";

export const createNotification = async ({ user, type = "system", title, message, file = null, metadata = {} }) => {
  if (!user || !title || !message) return null;

  return Notification.create({
    user,
    type,
    title,
    message,
    file,
    metadata
  });
};

export const notifyUsers = async (users, payload) => {
  const uniqueUsers = [...new Set((users || []).filter(Boolean).map((value) => value.toString()))];
  if (!uniqueUsers.length) return [];

  return Promise.all(uniqueUsers.map((user) => createNotification({ ...payload, user })));
};
