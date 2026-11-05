import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

export const productRelations = {
  category: true,
  variants: {
    orderBy: [{ isDefault: "desc" as const }, { name: "asc" as const }],
  },
  images: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.ProductInclude;
export type FullProduct = Prisma.ProductGetPayload<{
  include: typeof productRelations;
}>;

export const productModel = {
  list: (where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[]) => db.product.findMany({ where, orderBy, include: productRelations }),
  findById: (id: string, client: Prisma.TransactionClient = db) =>
    client.product.findUniqueOrThrow({
      where: { id },
      include: productRelations,
    }),
  findPublishedBySlug: (slug: string) =>
    db.product.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: productRelations,
    }),
  create: (data: Prisma.ProductUncheckedCreateInput, client: Prisma.TransactionClient) => client.product.create({ data }),
  update: (id: string, data: Prisma.ProductUncheckedUpdateInput, client: Prisma.TransactionClient) => client.product.update({ where: { id }, data }),
  delete: (id: string, client: Prisma.TransactionClient) => client.product.delete({ where: { id } }),
  count: (status?: "DRAFT" | "PUBLISHED" | "ARCHIVED") => db.product.count({ where: status ? { status } : {} }),
};
