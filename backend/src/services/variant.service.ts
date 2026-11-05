import type { z } from "zod";
import { write } from "../config/database.ts";
import { HttpError } from "../utils/http-error.ts";
import { variantModel } from "../models/variant.model.ts";
import { productModel } from "../models/product.model.ts";
import { assetDeletionModel } from "../models/asset-deletion.model.ts";
import { assertProduct, productDto } from "./product.service.ts";
import type { variantInput, variantPatch } from "../validators/catalogue.validator.ts";

export async function createVariant(productId: string, input: z.infer<typeof variantInput>) {
  if (input.isDefault && !input.isActive) throw new HttpError(409, "The default variant must be active");
  return productDto(
    await write(async (client) => {
      if (input.isDefault) await variantModel.clearDefault(productId, client);
      await variantModel.create({ ...input, productId }, client);
      return assertProduct(client, productId);
    }),
  );
}

export async function updateVariant(id: string, input: z.infer<typeof variantPatch>) {
  return productDto(
    await write(async (client) => {
      const existing = await variantModel.findById(id, client);
      if ((input.isDefault ?? existing.isDefault) && input.isActive === false) throw new HttpError(409, "The default variant must be active");
      if (input.isDefault) await variantModel.clearDefault(existing.productId, client);
      await variantModel.update(id, input, client);
      return assertProduct(client, existing.productId);
    }),
  );
}

export async function deleteVariant(id: string) {
  return productDto(
    await write(async (client) => {
      const existing = await variantModel.findById(id, client);
      if (existing.isDefault) throw new HttpError(409, "Choose another default variant before deleting this one");
      const product = await productModel.findById(existing.productId, client);
      await assetDeletionModel.enqueue(
        product.images.filter((image) => image.variantId === id).map((image) => image.publicId),
        client,
      );
      await variantModel.delete(id, client);
      return assertProduct(client, existing.productId);
    }),
  );
}
