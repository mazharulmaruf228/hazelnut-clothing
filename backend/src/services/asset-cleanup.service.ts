import { assetDeletionModel } from "../models/asset-deletion.model.ts";
import { destroyAsset } from "../integrations/cloudinary.ts";

export async function processAssetDeletions() {
  for (const task of await assetDeletionModel.pending()) {
    try {
      await destroyAsset(task.publicId);
      await assetDeletionModel.complete(task.publicId);
    } catch {
      await assetDeletionModel.retry(task.publicId, task.attempts + 1);
      console.error({ event: "asset_cleanup_retry", publicId: task.publicId });
    }
  }
}
