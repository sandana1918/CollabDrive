import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "..", process.env.LOCAL_UPLOAD_DIR || "uploads");

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const provider = process.env.STORAGE_PROVIDER || "local";

const s3Client =
  provider === "s3"
    ? new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
        }
      })
    : null;

export const storageConfig = {
  provider,
  uploadDir,
  ensureUploadDir,
  async uploadLocal(file) {
    ensureUploadDir();
    const destination = path.join(uploadDir, file.generatedName);
    await fs.promises.writeFile(destination, file.buffer);
    return {
      storageKey: file.generatedName,
      location: destination
    };
  },
  async uploadS3(file) {
    if (!s3Client || !process.env.AWS_S3_BUCKET) {
      throw new Error("S3 storage is selected but AWS credentials are incomplete.");
    }

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: file.generatedName,
        Body: file.buffer,
        ContentType: file.mimetype
      }
    });

    const result = await upload.done();

    return {
      storageKey: file.generatedName,
      location: result.Location
    };
  },
  async removeFile(storageKey) {
    if (!storageKey) {
      return;
    }

    if (provider === "s3") {
      if (!s3Client || !process.env.AWS_S3_BUCKET) {
        return;
      }

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: storageKey
        })
      );

      return;
    }

    const target = path.join(uploadDir, storageKey);
    if (fs.existsSync(target)) {
      await fs.promises.unlink(target);
    }
  },
  async getDownloadStream(storageKey) {
    if (provider === "s3") {
      if (!s3Client || !process.env.AWS_S3_BUCKET) {
        throw new Error("S3 storage is selected but AWS credentials are incomplete.");
      }

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: storageKey
        })
      );

      return response.Body;
    }

    return fs.createReadStream(path.join(uploadDir, storageKey));
  }
};
