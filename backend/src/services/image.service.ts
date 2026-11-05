import sharp from "sharp";
import type { z } from "zod";
import { write } from "../config/database.ts";
import { config } from "../config/env.ts";
import { HttpError } from "../utils/http-error.ts";
import { productModel } from "../models/product.model.ts";
import { variantModel } from "../models/variant.model.ts";
import { imageModel } from "../models/image.model.ts";
import { assetDeletionModel } from "../models/asset-deletion.model.ts";
import { uploadAsset, destroyAsset } from "../integrations/cloudinary.ts";
import { assertProduct } from "./product.service.ts";
import type { uploadInput, imagePatch } from "../validators/catalogue.validator.ts";

export async function uploadImages(input: z.infer<typeof uploadInput>, files: Buffer[]) {
  if (!config.CLOUDINARY_API_KEY) throw new HttpError(503, "Cloudinary has not been configured");
  await productModel.findById(input.productId);
  if (input.variantId && !(await variantModel.belongsTo(input.variantId, input.productId))) throw new HttpError(400, "Variant does not belong to product");
  if (!files.length) throw new HttpError(400, "Select at least one image");
  const assets: Awaited<ReturnType<typeof uploadAsset>>[] = [];
  try {
    for (const file of files) {
      const decoder = sharp(file, { limitInputPixels: 40_000_000 });
      const metadata = await decoder.metadata();
      if (!["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format || "")) throw new HttpError(400, "Only JPEG, PNG, WebP and AVIF images are supported");
      const buffer = await decoder
        .rotate()
        .resize({
          width: 2400,
          height: 3000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88 })
        .toBuffer();
      assets.push(await uploadAsset(buffer));
    }
    return await write(async (client) => {
      const count = await imageModel.countForProduct(input.productId, client);
      return Promise.all(
        assets.map((asset, index) =>
          imageModel.create(
            {
              productId: input.productId,
              variantId: input.variantId,
              alt: input.alt,
              imageUrl: asset.secure_url,
              publicId: asset.public_id,
              width: asset.width,
              height: asset.height,
              sortOrder: count + index,
            },
            client,
          ),
        ),
      );
    });
  } catch (error) {
    const failed: string[] = [];
    for (const asset of assets) {
      try {
        await destroyAsset(asset.public_id);
      } catch {
        failed.push(asset.public_id);
      }
    }
    if (failed.length) await write((client) => assetDeletionModel.enqueue(failed, client));
    throw error;
  }
}

export function updateImage(id: string, input: z.infer<typeof imagePatch>) {
  return write(async (client) => {
    const image = await imageModel.findById(id, client);
    if (input.variantId && !(await variantModel.belongsTo(input.variantId, image.productId, client))) throw new HttpError(400, "Variant does not belong to product");
    const updated = await imageModel.update(id, input, client);
    await assertProduct(client, image.productId);
    return updated;
  });
}

export async function deleteImage(id: string) {
  await write(async (client) => {
    const existing = await imageModel.delete(id, client);
    await assertProduct(client, existing.productId);
    await assetDeletionModel.enqueue([existing.publicId], client);
  });
}

export function reorderImages(productId: string, imageIds: string[]) {
  return write(async (client) => {
    const product = await productModel.findById(productId, client);
    if (product.images.length !== imageIds.length || product.images.some((image) => !imageIds.includes(image.id))) throw new HttpError(409, "Image list changed. Reload before reordering.");
    for (const [sortOrder, id] of imageIds.entries()) await imageModel.update(id, { sortOrder }, client);
    return { ok: true };
  });
}
