import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

export const variantModel = {
  findById: (id: string, client: Prisma.TransactionClient = db) => client.productVariant.findUniqueOrThrow({ where: { id } }),
  belongsTo: (id: string, productId: string, client: Prisma.TransactionClient = db) => client.productVariant.findFirst({ where: { id, productId } }),
  clearDefault: (productId: string, client: Prisma.TransactionClient) =>
    client.productVariant.updateMany({
      where: { productId },
      data: { isDefault: false },
    }),
  create: (data: Prisma.ProductVariantUncheckedCreateInput, client: Prisma.TransactionClient) => client.productVariant.create({ data }),
  update: (id: string, data: Prisma.ProductVariantUncheckedUpdateInput, client: Prisma.TransactionClient) => client.productVariant.update({ where: { id }, data }),
  delete: (id: string, client: Prisma.TransactionClient) => client.productVariant.delete({ where: { id } }),
};
