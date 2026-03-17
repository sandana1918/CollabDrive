import mongoose from "mongoose";

const documentVersionSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true
    },
    content: {
      type: String,
      default: ""
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

documentVersionSchema.index({ file: 1, createdAt: -1 });

export const DocumentVersion = mongoose.model("DocumentVersion", documentVersionSchema);
