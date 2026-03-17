import mongoose from "mongoose";

const sharedUserSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["editor", "commenter", "viewer"],
      required: true
    }
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    action: String,
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ["folder", "document", "file"],
      default: "file"
    },
    documentFormat: {
      type: String,
      enum: ["plain", "markdown", "richtext", "binary"],
      default: "binary"
    },
    mimeType: {
      type: String,
      default: "application/octet-stream"
    },
    size: {
      type: Number,
      default: 0
    },
    storageKey: String,
    storageProvider: {
      type: String,
      default: "local"
    },
    content: {
      type: String,
      default: ""
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null
    },
    sharedWith: [sharedUserSchema],
    visibility: {
      type: String,
      enum: ["private", "link", "public"],
      default: "private"
    },
    linkShare: {
      enabled: {
        type: Boolean,
        default: false
      },
      token: String,
      role: {
        type: String,
        enum: ["viewer", "commenter", "editor"],
        default: "viewer"
      }
    },
    isStarred: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    starredBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    pinnedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    isTrashed: {
      type: Boolean,
      default: false
    },
    trashedAt: Date,
    trashedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    preview: {
      kind: {
        type: String,
        enum: ["none", "image", "pdf"],
        default: "none"
      },
      url: String
    },
    lastOpenedAt: Date,
    tags: [String],
    activity: [activitySchema]
  },
  { timestamps: true }
);

fileSchema.index({ owner: 1, parent: 1, isTrashed: 1, updatedAt: -1 });
fileSchema.index({ "sharedWith.user": 1, isTrashed: 1 });
fileSchema.index({ filename: "text", originalName: "text", content: "text" });

export const File = mongoose.model("File", fileSchema);
