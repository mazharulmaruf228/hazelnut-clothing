import { Prisma } from "@prisma/client";
import type { z } from "zod";
import jwt from "jsonwebtoken";
import { write } from "../config/database.ts";
import { config } from "../config/env.ts";
import { initiateSandboxCheckout, querySandboxTransaction, validateSandboxPayment } from "../integrations/sslcommerz.ts";
import { paymentModel } from "../models/payment.model.ts";
import { orderModel } from "../models/order.model.ts";
import { HttpError } from "../utils/http-error.ts";
import { sandboxGatewayUrl } from "../utils/payment-gateway.ts";
import { createOrder } from "./order.service.ts";
import type { createOrderInput, orderLookupInput } from "../validators/catalogue.validator.ts";

export async function createSandboxOrder(input: z.infer<typeof createOrderInput>, idempotencyKey: string) {
  if (input.customerName.length > 50 || input.email.length > 50 || input.phone.length > 20 || input.deliveryAddress.length > 50) {
    throw new HttpError(400, "For online payment, name, email and address must be at most 50 characters and phone at most 20 characters");
  }
  if (!config.SSLCOMMERZ_STORE_ID || !config.SSLCOMMERZ_STORE_PASSWORD || !config.PAYMENT_CALLBACK_ORIGIN) throw new HttpError(503, "Sandbox payment is not configured");
  const receipt = await createOrder(input, { idempotencyKey, expiresAt: new Date(Date.now() + config.PAYMENT_HOLD_MINUTES * 60_000) });
  const payment = await write(async (client) => {
    const existing = await client.payment.findUniqueOrThrow({ where: { orderId: receipt.id } });
    if (existing.initiationStartedAt || existing.status !== "INITIATING" || existing.expiresAt <= new Date()) return { ...existing, claimed: false };
    const claimed = await client.payment.update({ where: { id: existing.id }, data: { initiationStartedAt: new Date() } });
    return { ...claimed, claimed: true };
  });
  if (!payment.claimed) return { ...receipt, paymentStatus: payment.status, gatewayUrl: payment.status === "PENDING" && payment.expiresAt > new Date() ? payment.gatewayUrl : null };
  try {
    const session = await initiateSandboxCheckout({
      transactionId: payment.transactionId,
      total: receipt.total,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      address: input.deliveryAddress,
      district: input.district,
      postcode: input.postcode,
    });
    const updated = await write(async (client) => {
      const current = await client.payment.findUniqueOrThrow({ where: { id: payment.id } });
      return client.payment.update({
        where: { id: payment.id },
        data: { sessionKey: session.sessionKey, gatewayUrl: session.gatewayUrl, ...(current.status === "INITIATING" && current.expiresAt > new Date() ? { status: "PENDING" } : {}) },
      });
    });
    return { ...receipt, paymentStatus: updated.status, gatewayUrl: updated.status === "PENDING" && updated.expiresAt > new Date() ? updated.gatewayUrl : null };
  } catch {
    console.error({ event: "payment_initiation_unavailable", paymentId: payment.id });
    return { ...receipt, paymentStatus: payment.status, gatewayUrl: null };
  }
}

async function releaseReservation(client: Prisma.TransactionClient, orderId: string) {
  const order = await client.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.status !== "PENDING_REVIEW") return;
  for (const item of order.items) {
    if (!item.variantId) continue;
    const updated = await client.productVariant.updateMany({
      where: { id: item.variantId, stockReserved: { gte: item.quantity } },
      data: { stockReserved: { decrement: item.quantity } },
    });
    if (updated.count !== 1) throw new Error("Reserved stock changed; payment reservation could not be released");
  }
  await client.order.update({ where: { id: orderId }, data: { status: "REJECTED" } });
}

export async function expirePaymentReservations(now = new Date()) {
  const expired = await paymentModel.expired(now);
  for (const candidate of expired) {
    await write(async (client) => {
      const payment = await client.payment.findUnique({ where: { id: candidate.id } });
      if (!payment || !["INITIATING", "PENDING"].includes(payment.status) || payment.expiresAt > now) return;
      await releaseReservation(client, payment.orderId);
      await client.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED" } });
    });
  }
}

export async function validatePayment(validationId: string) {
  const result = await validateSandboxPayment(validationId);
  if (!["VALID", "VALIDATED"].includes(result.status) || result.val_id !== validationId) throw new HttpError(400, "Payment validation failed");
  return write(async (client) => {
    const payment = await client.payment.findUnique({ where: { transactionId: result.tran_id }, include: { order: true } });
    if (!payment || result.currency_type !== "BDT") throw new HttpError(400, "Payment validation failed");
    let amount: Prisma.Decimal;
    try {
      amount = new Prisma.Decimal(result.currency_amount);
    } catch {
      throw new HttpError(400, "Payment validation failed");
    }
    if (!amount.isFinite() || !amount.equals(payment.order.subtotal.add(payment.order.deliveryCharge))) throw new HttpError(400, "Payment validation failed");
    if (payment.validationId) {
      if (payment.validationId !== validationId && (!payment.bankTransactionId || !result.bank_tran_id || payment.bankTransactionId !== result.bank_tran_id)) {
        const duplicate = await client.duplicatePaymentCharge.findUnique({ where: { validationId } });
        if (duplicate && duplicate.paymentId !== payment.id) throw new HttpError(409, "Payment validation ID belongs to another order");
        if (!duplicate) {
          await client.duplicatePaymentCharge.create({ data: { paymentId: payment.id, validationId, bankTransactionId: result.bank_tran_id } });
          console.error({ event: "duplicate_payment_requires_refund", paymentId: payment.id });
        }
      }
      return;
    }
    const expired = payment.expiresAt <= new Date() || payment.status === "EXPIRED" || payment.order.status === "REJECTED";
    if (expired && payment.order.status === "PENDING_REVIEW") await releaseReservation(client, payment.orderId);
    const status = expired ? "REFUND_REQUIRED" : String(result.risk_level) === "0" ? "PAID" : "RISK_REVIEW";
    await client.payment.update({
      where: { id: payment.id },
      data: { status, validationId, bankTransactionId: result.bank_tran_id, paidAt: new Date() },
    });
  });
}

export async function reconcilePayments(now = new Date()) {
  const candidates = await paymentModel.dueForReconciliation(now);
  for (const candidate of candidates) {
    const transactionId = await write(async (client) => {
      const payment = await client.payment.findUnique({ where: { id: candidate.id } });
      if (!payment || payment.nextReconcileAt > now || (!["INITIATING", "PENDING", "EXPIRED"].includes(payment.status) && (!payment.paidAt || payment.paidAt.getTime() < now.getTime() - 7 * 24 * 60 * 60_000))) return null;
      await client.payment.update({ where: { id: payment.id }, data: { nextReconcileAt: new Date(now.getTime() + 5 * 60_000) } });
      return payment.transactionId;
    });
    if (!transactionId) continue;
    try {
      const result = await querySandboxTransaction(transactionId);
      for (const transaction of result.element ?? []) {
        if (["VALID", "VALIDATED"].includes(transaction.status) && transaction.val_id) await validatePayment(transaction.val_id);
      }
    } catch {
      console.error({ event: "payment_reconciliation_unavailable", paymentId: candidate.id });
    }
  }
}

export async function reviewRisk(orderId: string, decision: "APPROVE" | "REJECT") {
  return write(async (client) => {
    const payment = await client.payment.findUnique({ where: { orderId } });
    if (!payment || payment.status !== "RISK_REVIEW") throw new HttpError(409, "Payment is not awaiting risk review");
    if (decision === "REJECT") await releaseReservation(client, orderId);
    await client.payment.update({ where: { id: payment.id }, data: { status: decision === "APPROVE" ? "PAID" : "REFUND_REQUIRED" } });
  });
}

export async function recordRefund(orderId: string, amount: string, reference: string, note: string, adminId: string) {
  return write(async (client) => {
    const payment = await client.payment.findUnique({ where: { orderId }, include: { order: true } });
    if (!payment || payment.status !== "REFUND_REQUIRED") throw new HttpError(409, "Payment is not awaiting a refund");
    if (!new Prisma.Decimal(amount).equals(payment.order.subtotal.add(payment.order.deliveryCharge))) throw new HttpError(400, "Record the full order total as the refund amount");
    await client.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", refundAmount: amount, refundReference: reference, refundNote: note, refundedBy: adminId, refundedAt: new Date() } });
  });
}

export function checkoutMode() {
  return config.PAYMENT_MODE;
}

export async function hasCheckout(idempotencyKey: string) {
  return Boolean(await paymentModel.findForCheckout(idempotencyKey));
}

export async function checkoutStatus(idempotencyKey: string) {
  const payment = await paymentModel.findForCheckout(idempotencyKey);
  if (!payment) throw new HttpError(404, "Checkout not found");
  return {
    id: payment.order.id,
    status: payment.order.status,
    subtotal: payment.order.subtotal.toFixed(2),
    deliveryCharge: payment.order.deliveryCharge.toFixed(2),
    total: payment.order.subtotal.add(payment.order.deliveryCharge).toFixed(2),
    paymentStatus: payment.status,
    gatewayUrl: payment.order.status === "PENDING_REVIEW" && payment.status === "PENDING" && payment.expiresAt > new Date() ? sandboxGatewayUrl(payment.gatewayUrl) : null,
  };
}

export async function resumeGuestPayment(input: z.infer<typeof orderLookupInput>) {
  return write(async (client) => {
    const order = await orderModel.findForGuestLookup(input.orderNumber, input.email, input.phone, client);
    if (!order) throw new HttpError(404, "No order matched that order number and contact detail");
    const gatewayUrl = sandboxGatewayUrl(order.payment?.gatewayUrl);
    if (order.status !== "PENDING_REVIEW" || !order.payment || order.payment.status !== "PENDING" || order.payment.expiresAt <= new Date() || !gatewayUrl) {
      throw new HttpError(409, "Payment cannot be continued for this order");
    }
    const statusToken = jwt.sign({}, config.JWT_SECRET, { subject: order.id, expiresIn: "1h", issuer: "catalogue-api", audience: "catalogue-guest-payment" });
    return { orderId: order.id, gatewayUrl, statusToken };
  });
}

export async function guestPaymentStatus(orderId: string, statusToken: string) {
  let payload;
  try {
    payload = jwt.verify(statusToken, config.JWT_SECRET, { algorithms: ["HS256"], issuer: "catalogue-api", audience: "catalogue-guest-payment" });
  } catch {
    throw new HttpError(401, "Payment status access expired");
  }
  if (typeof payload === "string" || payload.sub !== orderId) throw new HttpError(401, "Payment status access expired");
  const payment = await paymentModel.findForOrder(orderId);
  if (!payment) throw new HttpError(404, "Checkout not found");
  return {
    id: payment.order.id,
    status: payment.order.status,
    subtotal: payment.order.subtotal.toFixed(2),
    deliveryCharge: payment.order.deliveryCharge.toFixed(2),
    total: payment.order.subtotal.add(payment.order.deliveryCharge).toFixed(2),
    paymentStatus: payment.status,
    gatewayUrl: null,
  };
}

export async function recordDuplicateRefund(orderId: string, chargeId: string, amount: string, reference: string, note: string, adminId: string) {
  return write(async (client) => {
    const charge = await client.duplicatePaymentCharge.findUnique({ where: { id: chargeId }, include: { payment: { include: { order: true } } } });
    if (!charge || charge.payment.orderId !== orderId || charge.refundedAt) throw new HttpError(409, "Duplicate payment is not awaiting a refund");
    if (!new Prisma.Decimal(amount).equals(charge.payment.order.subtotal.add(charge.payment.order.deliveryCharge))) throw new HttpError(400, "Record the full order total as the refund amount");
    await client.duplicatePaymentCharge.update({ where: { id: charge.id }, data: { refundReference: reference, refundNote: note, refundedBy: adminId, refundedAt: new Date() } });
  });
}

export async function orderForPaymentReturn(transactionId: string | undefined) {
  if (!transactionId) return null;
  return (await paymentModel.findOrderForTransaction(transactionId))?.orderId ?? null;
}
