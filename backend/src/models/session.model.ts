import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

export const sessionModel = {
  create: (data: Prisma.AdminSessionUncheckedCreateInput, client: Prisma.TransactionClient = db) => client.adminSession.create({ data }),
  findById: (id: string) => db.adminSession.findUnique({ where: { id }, include: { user: true } }),
  findByHash: (tokenHash: string, client: Prisma.TransactionClient = db) =>
    client.adminSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    }),
  claim: (id: string, client: Prisma.TransactionClient = db) =>
    client.adminSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  revokeFamily: (familyId: string, client: Prisma.TransactionClient = db) =>
    client.adminSession.updateMany({
      where: { familyId },
      data: { revokedAt: new Date() },
    }),
  revokeToken: (tokenHash: string) =>
    db.adminSession.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }),
  deleteForUser: (userId: string, client: Prisma.TransactionClient = db) => client.adminSession.deleteMany({ where: { userId } }),
};
