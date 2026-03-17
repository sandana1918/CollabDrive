import { Router } from "express";
import { shareFile, unshareFile, updateSharingSettings, revokeAllAccess } from "../controllers/shareController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/:id", shareFile);
router.patch("/:id/settings", updateSharingSettings);
router.post("/:id/revoke-all", revokeAllAccess);
router.delete("/:id/:userId", unshareFile);

export default router;
