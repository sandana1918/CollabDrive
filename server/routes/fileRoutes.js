import { Router } from "express";
import {
  addComment,
  bulkFileAction,
  createDocument,
  createFolder,
  deleteFile,
  downloadFile,
  getActivityFeed,
  getDocumentContent,
  listFiles,
  moveFile,
  renameFile,
  resolveComment,
  restoreDocumentVersion,
  restoreFile,
  toggleFavorite,
  trashFile,
  updateDocumentContent,
  uploadFile
} from "../controllers/fileController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/:id/content", optionalAuth, getDocumentContent);
router.get("/:id/download", optionalAuth, downloadFile);

router.use(requireAuth);
router.get("/", listFiles);
router.get("/activity", getActivityFeed);
router.post("/bulk", bulkFileAction);
router.post("/upload", upload.single("file"), uploadFile);
router.post("/documents", createDocument);
router.post("/folders", createFolder);
router.post("/:id/comments", addComment);
router.post("/:id/versions/:versionId/restore", restoreDocumentVersion);
router.patch("/:id/content", updateDocumentContent);
router.patch("/:id/rename", renameFile);
router.patch("/:id/move", moveFile);
router.patch("/:id/favorite/:kind", toggleFavorite);
router.patch("/:id/trash", trashFile);
router.patch("/:id/restore", restoreFile);
router.patch("/:id/comments/:commentId", resolveComment);
router.delete("/:id", deleteFile);

export default router;
