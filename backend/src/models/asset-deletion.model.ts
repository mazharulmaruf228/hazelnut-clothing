import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

export const assetDeletionModel = {
  enqueue: (publicIds: string[], client: Prisma.TransactionClient) =>
    client.assetDeletion.createMany({
      data: publicIds.filter((publicId) => publicId.startsWith("catalogue/")).map((publicId) => ({ publicId })),
      skipDuplicates: true,
    }),
  pending: () =>
    db.assetDeletion.findMany({
      where: { nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
      take: 25,
    }),
  complete: (publicId: string) => db.assetDeletion.deleteMany({ where: { publicId } }),
  retry: (publicId: string, attempts: number) =>
    db.assetDeletion.updateMany({
      where: { publicId },
      data: {
        attempts,
        nextAttemptAt: new Date(Date.now() + Math.min(86400_000, 60_000 * 2 ** Math.min(attempts, 10))),
      },
    }),
};
