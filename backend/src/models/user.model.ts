import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

type Client = Prisma.TransactionClient;

export const userModel = {
  findById: (id: string, client: Client = db) => client.adminUser.findUniqueOrThrow({ where: { id } }),
  findByEmail: (email: string, client: Client = db) => client.adminUser.findUnique({ where: { email } }),
  list: () => db.adminUser.findMany({ orderBy: { createdAt: "desc" } }),
  countActiveAdmins: (client: Client = db) => client.adminUser.count({ where: { role: "ADMIN", isActive: true } }),
  countPending: () => db.adminUser.count({ where: { approvedAt: null } }),
  create: (data: Prisma.AdminUserCreateInput, client: Client = db) => client.adminUser.create({ data }),
  update: (id: string, data: Prisma.AdminUserUpdateInput, client: Client = db) => client.adminUser.update({ where: { id }, data }),
  delete: (id: string, client: Client) => client.adminUser.delete({ where: { id } }),
  findGoogleIdentity: (subject: string, client: Client = db) =>
    client.oAuthIdentity.findUnique({
      where: { subject },
      include: { user: true },
    }),
  linkGoogle: (subject: string, userId: string, client: Client) => client.oAuthIdentity.create({ data: { subject, userId } }),
};
