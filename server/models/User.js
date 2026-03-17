import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    viewMode: {
      type: String,
      enum: ["list", "grid"],
      default: "list"
    },
    density: {
      type: String,
      enum: ["comfortable", "dense"],
      default: "comfortable"
    },
    theme: {
      type: String,
      enum: ["light"],
      default: "light"
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    avatarColor: {
      type: String,
      default: "#3B82F6"
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
