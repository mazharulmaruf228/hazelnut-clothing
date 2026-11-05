import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

export const imageModel = {
  findById: (id: string, client: Prisma.TransactionClient = db) => client.productImage.findUniqueOrThrow({ where: { id } }),
  countForProduct: (productId: string, client: Prisma.TransactionClient) => client.productImage.count({ where: { productId } }),
  create: (data: Prisma.ProductImageUncheckedCreateInput, client: Prisma.TransactionClient) => client.productImage.create({ data }),
  update: (id: string, data: Prisma.ProductImageUncheckedUpdateInput, client: Prisma.TransactionClient) => client.productImage.update({ where: { id }, data }),
  delete: (id: string, client: Prisma.TransactionClient) => client.productImage.delete({ where: { id } }),
};
