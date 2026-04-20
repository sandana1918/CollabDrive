import { File } from "../models/File.js";
import { User } from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { DocumentVersion } from "../models/DocumentVersion.js";
import { createNotification } from "../services/notificationService.js";
import * as Y from "yjs";

const documentPresence = new Map();
const unsavedDocumentState = new Map();
const socketPermissions = new Map();
const yDocuments = new Map();

const getYDocument = (documentId) => {
  const key = documentId.toString();
  if (!yDocuments.has(key)) {
    yDocuments.set(key, {
      doc: new Y.Doc(),
      initialized: false,
      seedingSocketId: null,
      updatedAt: Date.now()
    });
  }
  return yDocuments.get(key);
};

const toUint8Array = (update) => {
  if (update instanceof Uint8Array) return update;
  if (update instanceof ArrayBuffer) return new Uint8Array(update);
  if (Array.isArray(update)) return new Uint8Array(update);
  if (update?.data && Array.isArray(update.data)) return new Uint8Array(update.data);
  return new Uint8Array(update || []);
};

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

const updateParticipantCursor = (documentId, socketId, cursor) => {
  const roomState = documentPresence.get(documentId) || [];
  const participant = roomState.find((entry) => entry.socketId === socketId);
  if (participant) participant.cursor = cursor || null;
  documentPresence.set(documentId, roomState);
};

export const registerCollaborationHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required."));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select("name username email avatarColor");
      if (!user) return next(new Error("User not found."));

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

      const yState = getYDocument(documentId);
      const roomState = documentPresence.get(documentId) || [];
      roomState.push({ socketId: socket.id, userId: socket.user._id.toString(), cursor: null });
      documentPresence.set(documentId, roomState);

      const content = unsavedDocumentState.get(documentId) ?? file.content;
      const canEdit = ["owner", "editor"].includes(role);
      const canSeed = canEdit && !yState.initialized && !yState.seedingSocketId;
      if (canSeed) yState.seedingSocketId = socket.id;
      socket.emit("document-loaded", { content, role, documentFormat: file.documentFormat, userId: socket.user._id.toString() });
      socket.emit("yjs-state", {
        update: Y.encodeStateAsUpdate(yState.doc),
        initialized: yState.initialized,
        canSeed,
        content
      });
      io.to(documentId).emit("presence-update", await getPresencePayload(documentId));
    });

    socket.on("cursor-move", async ({ documentId, cursor }) => {
      const permission = socketPermissions.get(socket.id);
      if (!permission || permission.documentId !== documentId) return;

      updateParticipantCursor(documentId, socket.id, cursor);
      io.to(documentId).emit("presence-update", await getPresencePayload(documentId));
    });

    socket.on("send-changes", async ({ documentId, content, cursor }) => {
      const permission = socketPermissions.get(socket.id);
      if (!permission || permission.documentId !== documentId || !["owner", "editor"].includes(permission.role)) return;

      unsavedDocumentState.set(documentId, content);
      updateParticipantCursor(documentId, socket.id, cursor);
      socket.to(documentId).emit("receive-changes", { content, senderId: socket.user._id.toString(), cursor: cursor || null });
      io.to(documentId).emit("presence-update", await getPresencePayload(documentId));
    });

    socket.on("yjs-update", async ({ documentId, update, cursor }) => {
      const permission = socketPermissions.get(socket.id);
      if (!permission || permission.documentId !== documentId || !["owner", "editor"].includes(permission.role)) return;

      try {
        const yState = getYDocument(documentId);
        const binaryUpdate = toUint8Array(update);
        Y.applyUpdate(yState.doc, binaryUpdate);
        yState.initialized = true;
        yState.seedingSocketId = null;
        yState.updatedAt = Date.now();
        updateParticipantCursor(documentId, socket.id, cursor);
        socket.to(documentId).emit("yjs-update", { update: binaryUpdate, senderSocketId: socket.id });
        io.to(documentId).emit("presence-update", await getPresencePayload(documentId));
      } catch (error) {
        socket.emit("editor-error", { message: "Could not sync document changes." });
      }
    });

    socket.on("awareness-update", ({ documentId, update }) => {
      const permission = socketPermissions.get(socket.id);
      if (!permission || permission.documentId !== documentId) return;
      socket.to(documentId).emit("awareness-update", { update, senderSocketId: socket.id });
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
      io.to(documentId).emit("document-saved", { updatedAt: file.updatedAt, userId: socket.user._id.toString() });

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
        const yState = yDocuments.get(documentId);
        if (yState?.seedingSocketId === socket.id && !yState.initialized) yState.seedingSocketId = null;
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
