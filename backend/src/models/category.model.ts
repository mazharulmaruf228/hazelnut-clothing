import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

export const categoryModel = {
  list: () =>
    db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
  listPublishedCounts: () =>
    db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    }),
  findById: (id: string, client: Prisma.TransactionClient) => client.category.findUniqueOrThrow({ where: { id } }),
  create: (data: Prisma.CategoryUncheckedCreateInput, client: Prisma.TransactionClient) => client.category.create({ data }),
  update: (id: string, data: Prisma.CategoryUncheckedUpdateInput, client: Prisma.TransactionClient) => client.category.update({ where: { id }, data }),
  delete: (id: string, client: Prisma.TransactionClient) => client.category.delete({ where: { id } }),
  count: () => db.category.count(),
};
