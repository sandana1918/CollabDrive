import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { connectDatabase } from "./config/db.js";
import { storageConfig } from "./config/storage.js";
import authRoutes from "./routes/authRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import sharingRoutes from "./routes/sharingRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { registerCollaborationHandlers } from "./sockets/collaboration.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  }
});

storageConfig.ensureUploadDir();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "CollabDrive API is running."
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/sharing", sharingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

registerCollaborationHandlers(io);

const port = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
