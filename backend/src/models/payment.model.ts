import { db } from "../config/database.ts";

export const paymentModel = {
  findForCheckout: (idempotencyKey: string) => db.payment.findUnique({ where: { idempotencyKey }, include: { order: true } }),
  findForOrder: (orderId: string) => db.payment.findUnique({ where: { orderId }, include: { order: true } }),
  findOrderForTransaction: (transactionId: string) => db.payment.findUnique({ where: { transactionId }, select: { orderId: true } }),
  expired: (now: Date) => db.payment.findMany({ where: { status: { in: ["INITIATING", "PENDING"] }, expiresAt: { lte: now } }, select: { id: true }, take: 100, orderBy: { expiresAt: "asc" } }),
  dueForReconciliation: (now: Date) =>
    db.payment.findMany({ where: { nextReconcileAt: { lte: now }, OR: [{ status: { in: ["INITIATING", "PENDING", "EXPIRED"] } }, { paidAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60_000) } }] }, select: { id: true }, take: 20, orderBy: { nextReconcileAt: "asc" } }),
};
