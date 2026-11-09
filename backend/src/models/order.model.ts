import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "../config/database.ts";

const orderRelations = { items: { orderBy: { id: "asc" as const } } } satisfies Prisma.OrderInclude;
export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderRelations }>;

export const orderModel = {
  create: (data: Prisma.OrderUncheckedCreateInput, client: Prisma.TransactionClient) => client.order.create({ data, include: orderRelations }),
  list: () => db.order.findMany({ include: orderRelations, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
  findById: (id: string, client: Prisma.TransactionClient) => client.order.findUniqueOrThrow({ where: { id }, include: orderRelations }),
  updateStatus: (id: string, status: OrderStatus, client: Prisma.TransactionClient) => client.order.update({ where: { id }, data: { status }, include: orderRelations }),
  update: (id: string, data: Prisma.OrderUncheckedUpdateInput, client: Prisma.TransactionClient) => client.order.update({ where: { id }, data, include: orderRelations }),
  replaceItems: async (orderId: string, items: Prisma.OrderItemCreateManyInput[], client: Prisma.TransactionClient) => {
    await client.orderItem.deleteMany({ where: { orderId } });
    await client.orderItem.createMany({ data: items.map((item) => ({ ...item, orderId })) });
  },
};
