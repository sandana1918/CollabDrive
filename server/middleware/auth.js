import { User } from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { asyncHandler, AppError } from "../utils/errors.js";

const resolveToken = (req) => {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  return bearerToken || req.query.token || null;
};

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = resolveToken(req);
  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = resolveToken(req);

  if (!token) {
    throw new AppError("Authentication required.", 401);
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.userId).select("-password");

  if (!user) {
    throw new AppError("User account not found.", 401);
  }

  req.user = user;
  next();
});
