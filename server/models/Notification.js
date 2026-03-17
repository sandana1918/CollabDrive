import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["share", "edit", "trash", "restore", "system"],
      default: "system"
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File"
    },
    metadata: mongoose.Schema.Types.Mixed,
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
