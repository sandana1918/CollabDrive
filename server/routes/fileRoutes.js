import { Router } from "express";
import {
  createDocument,
  createFolder,
  deleteFile,
  downloadFile,
  getActivityFeed,
  getDocumentContent,
  listFiles,
  moveFile,
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
router.post("/upload", upload.single("file"), uploadFile);
router.post("/documents", createDocument);
router.post("/folders", createFolder);
router.patch("/:id/content", updateDocumentContent);
router.patch("/:id/move", moveFile);
router.patch("/:id/favorite/:kind", toggleFavorite);
router.patch("/:id/trash", trashFile);
router.patch("/:id/restore", restoreFile);
router.delete("/:id", deleteFile);

export default router;
