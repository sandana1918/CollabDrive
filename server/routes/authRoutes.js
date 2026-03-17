import { Router } from "express";
import {
  getProfile,
  listNotifications,
  login,
  markNotificationsRead,
  register,
  updatePreferences
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getProfile);
router.patch("/preferences", requireAuth, updatePreferences);
router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/read", requireAuth, markNotificationsRead);

export default router;
