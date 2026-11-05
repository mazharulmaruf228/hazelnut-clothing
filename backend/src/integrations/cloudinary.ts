import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/env.ts";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadAsset(buffer: Buffer) {
  return new Promise<{
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "catalogue", resource_type: "image" }, (error, result) => {
      if (error || !result) reject(error ?? new Error("Cloudinary returned no asset"));
      else resolve(result);
    });
    stream.end(buffer);
  });
}

export async function destroyAsset(publicId: string) {
  if (!publicId.startsWith("catalogue/")) return;
  await cloudinary.uploader.destroy(publicId);
}
