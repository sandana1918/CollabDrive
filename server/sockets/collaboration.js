import { File } from "../models/File.js";
import { User } from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { DocumentVersion } from "../models/DocumentVersion.js";
import { createNotification } from "../services/notificationService.js";

const documentPresence = new Map();
const unsavedDocumentState = new Map();
const socketPermissions = new Map();

const getPresencePayload = async (documentId) => {
  const socketEntries = Array.from(documentPresence.get(documentId) || []);
  const users = await User.find({ _id: { $in: socketEntries.map((entry) => entry.userId) } }).select(
    "name username email avatarColor"
  );

  return socketEntries.map((entry) => {
    const user = users.find((candidate) => candidate._id.toString() === entry.userId);
    return {
      socketId: entry.socketId,
      user: user || null,
      cursor: entry.cursor || null
    };
  });
};

export const registerCollaborationHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required."));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select("name username email avatarColor");
      if (!user) {
        return next(new Error("User not found."));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-document", async ({ documentId }) => {
      const file = await File.findById(documentId);
      if (!file || file.category !== "document" || file.isTrashed) {
        socket.emit("editor-error", { message: "Document not found." });
        return;
      }

      const isOwner = file.owner.toString() === socket.user._id.toString();
      const shareEntry = file.sharedWith.find((entry) => entry.user.toString() === socket.user._id.toString());
      const publicRole = file.visibility === "public" ? "viewer" : null;
      const role = isOwner ? "owner" : shareEntry?.role || publicRole;

      if (!role) {
        socket.emit("editor-error", { message: "Access denied." });
        return;
      }

      socketPermissions.set(socket.id, { documentId, role });
      socket.join(documentId);
      socket.currentDocumentId = documentId;

      const roomState = documentPresence.get(documentId) || [];
      roomState.push({ socketId: socket.id, userId: socket.user._id.toString(), cursor: null });
      documentPresence.set(documentId, roomState);

      const content = unsavedDocumentState.get(documentId) ?? file.content;
      socket.emit("document-loaded", { content, role, documentFormat: file.documentFormat });
      io.to(documentId).emit("presence-update", await getPresencePayload(documentId));
    });

    socket.on("send-changes", ({ documentId, content, cursor }) => {
      const permission = socketPermissions.get(socket.id);
      if (!permission || permission.documentId !== documentId || !["owner", "editor"].includes(permission.role)) return;

      unsavedDocumentState.set(documentId, content);
      const roomState = documentPresence.get(documentId) || [];
      const participant = roomState.find((entry) => entry.socketId === socket.id);
      if (participant) participant.cursor = cursor || null;

      socket.to(documentId).emit("receive-changes", { content, userId: socket.user._id, cursor: cursor || null });
    });

    socket.on("save-document", async ({ documentId, content }) => {
      const permission = socketPermissions.get(socket.id);
      if (!permission || permission.documentId !== documentId || !["owner", "editor"].includes(permission.role)) return;

      const file = await File.findById(documentId);
      if (!file) return;

      file.content = content ?? unsavedDocumentState.get(documentId) ?? file.content;
      file.lastOpenedAt = new Date();
      await file.save();

      await DocumentVersion.create({ file: file._id, content: file.content, editedBy: socket.user._id });
      unsavedDocumentState.delete(documentId);
      io.to(documentId).emit("document-saved", { updatedAt: file.updatedAt });

      await Promise.all(
        file.sharedWith
          .filter((entry) => entry.role === "viewer" || entry.role === "commenter")
          .map((entry) =>
            createNotification({
              user: entry.user,
              type: "edit",
              title: "Document changed",
              message: `${socket.user.name} updated ${file.filename}`,
              file: file._id
            })
          )
      );
    });

    socket.on("disconnect", async () => {
      const documentId = socket.currentDocumentId;
      const permission = socketPermissions.get(socket.id);

      if (documentId) {
        const roomState = (documentPresence.get(documentId) || []).filter((entry) => entry.socketId !== socket.id);
        documentPresence.set(documentId, roomState);
        socket.leave(documentId);

        if (["owner", "editor"].includes(permission?.role) && unsavedDocumentState.has(documentId)) {
          const file = await File.findById(documentId);
          if (file) {
            file.content = unsavedDocumentState.get(documentId);
            file.lastOpenedAt = new Date();
            await file.save();
          }
        }

        io.to(documentId).emit("presence-update", await getPresencePayload(documentId));
      }

      socketPermissions.delete(socket.id);
    });
  });
};
