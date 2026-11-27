import type { Prisma } from "@prisma/client";
import { db } from "../config/database.ts";
import type { OrderRecord } from "./order.model.ts";
import { HttpError } from "../utils/http-error.ts";

const include = { items: { orderBy: { id: "asc" as const } } };

export const paymentModel = {
  find: (id: string, client: Prisma.TransactionClient = db) => client.order.findUniqueOrThrow({ where: { id }, include }),
  findByKey: (checkoutKeyHash: string, client: Prisma.TransactionClient) => client.order.findUnique({ where: { checkoutKeyHash }, include }),
  findByIntent: (stripePaymentIntentId: string) => db.order.findUnique({ where: { stripePaymentIntentId }, include }),
  findBySession: (stripeSessionId: string) => db.order.findUnique({ where: { stripeSessionId }, include }),
  update: (id: string, data: Prisma.OrderUncheckedUpdateInput, client: Prisma.TransactionClient) => client.order.update({ where: { id }, data, include }),
  eventExists: (id: string, client: Prisma.TransactionClient) => client.paymentEvent.findUnique({ where: { id } }),
  recordEvent: (id: string, client: Prisma.TransactionClient) => client.paymentEvent.create({ data: { id } }),
  list: (after?: string) =>
    db.order.findMany({
      where: { paymentMethod: "STRIPE", OR: [{ status: "PENDING_PAYMENT" }, { paymentStatus: { in: ["PAID", "REFUND_PENDING", "REFUND_FAILED"] } }] },
      include,
      orderBy: { id: "asc" },
      take: 100,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
    }),
  adjustStock: async (order: OrderRecord, action: "consume" | "release" | "restore", client: Prisma.TransactionClient) => {
    for (const item of order.items) {
      if (!item.variantId) continue;
      const result = await client.productVariant.updateMany({
        where: {
          id: item.variantId,
          ...(action !== "restore" ? { stockReserved: { gte: item.quantity } } : {}),
          ...(action === "consume" ? { stockOnHand: { gte: item.quantity } } : {}),
        },
        data:
          action === "restore"
            ? { stockOnHand: { increment: item.quantity } }
            : {
                stockReserved: { decrement: item.quantity },
                ...(action === "consume" ? { stockOnHand: { decrement: item.quantity } } : {}),
              },
      });
      if (result.count !== 1) throw new HttpError(409, "Payment inventory changed; reconciliation is required");
    }
  },
};
