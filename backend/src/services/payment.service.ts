import type Stripe from "stripe";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { config } from "../config/env.ts";
import { write } from "../config/database.ts";
import { stripeGateway } from "../integrations/stripe.ts";
import { paymentModel } from "../models/payment.model.ts";
import type { OrderRecord } from "../models/order.model.ts";
import { HttpError } from "../utils/http-error.ts";
import { minorUnits, paymentHash } from "../utils/payment.ts";
import { orderReceipt } from "../utils/order-receipt.ts";

export function paymentMethods() {
  return { items: config.STRIPE_ENABLED ? ["COD", "STRIPE"] : ["COD"], stripeTestMode: true };
}

export function requireStripeCheckout() {
  if (!config.STRIPE_ENABLED) throw new HttpError(503, "Stripe checkout is not available");
}

function intentId(value: string | Stripe.PaymentIntent | null) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

export async function beginStripeCheckout(order: OrderRecord) {
  if (order.status !== "PENDING_PAYMENT") return orderReceipt(order);
  let session: Stripe.Checkout.Session | null = order.stripeSessionId ? await stripeGateway.retrieveSession(order.stripeSessionId) : null;
  if (!session) {
    if (Date.now() - order.createdAt.getTime() >= 25 * 60_000) {
      session = await stripeGateway.findSession(order.id, order.createdAt);
      if (!session) {
        await expireUnpaidOrder(order.id);
        throw new HttpError(409, "This checkout expired. Start a new checkout.");
      }
    } else {
      try {
        session = await stripeGateway.createSession({
          ...order,
          paymentExpiresAt: order.paymentExpiresAt!,
          deliveryCharge: order.deliveryCharge.toFixed(2),
          items: order.items.map((item) => ({ ...item, unitPrice: item.unitPrice.toFixed(2) })),
        });
      } catch (failure) {
        const type = typeof failure === "object" && failure !== null && "type" in failure ? failure.type : "";
        if (type === "StripeInvalidRequestError") {
          await expireUnpaidOrder(order.id);
          throw new HttpError(503, "Stripe could not start this payment. Your order was not charged.");
        }
        throw new HttpError(503, "Stripe did not confirm the checkout session. Retry with the same checkout details.");
      }
    }
  }
  await synchronizeSession(session);
  const current = await paymentModel.find(order.id);
  return { ...orderReceipt(current), checkoutUrl: current.status === "PENDING_PAYMENT" && session.status === "open" ? session.url : null };
}

async function expireUnpaidOrder(id: string) {
  return write(async (client) => {
    const order = await paymentModel.find(id, client);
    if (order.status !== "PENDING_PAYMENT") return;
    await paymentModel.adjustStock(order, "release", client);
    await paymentModel.update(id, { status: "PAYMENT_EXPIRED", paymentStatus: "UNPAID", stripeCheckoutUrl: null }, client);
  });
}

export async function synchronizeSession(session: Stripe.Checkout.Session, eventId?: string) {
  if (session.livemode) throw new HttpError(400, "Live Stripe events are not accepted");
  const id = session.client_reference_id;
  if (!id || session.metadata?.orderId !== id) return;
  const paymentIntentId = intentId(session.payment_intent);
  const refunds = session.payment_status === "paid" && paymentIntentId ? await stripeGateway.refunds(paymentIntentId) : [];
  await write(async (client) => {
    if (eventId && (await paymentModel.eventExists(eventId, client))) return;
    const order = await paymentModel.find(id, client);
    if (
      order.paymentMethod !== "STRIPE" ||
      session.mode !== "payment" ||
      session.currency !== order.currency ||
      session.amount_total !== minorUnits(order.subtotal.add(order.deliveryCharge).toFixed(2)) ||
      (order.stripeSessionId && order.stripeSessionId !== session.id) ||
      (order.stripePaymentIntentId && order.stripePaymentIntentId !== paymentIntentId)
    ) {
      throw new HttpError(409, "Stripe payment does not match the order");
    }
    await paymentModel.update(id, { stripeSessionId: session.id, stripeCheckoutUrl: session.url, ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}) }, client);
    if (session.payment_status === "paid" && paymentIntentId && order.paymentStatus !== "REFUNDED") {
      const refunded = refunds.filter((refund) => refund.status === "succeeded").reduce((total, refund) => total + refund.amount, 0);
      if (refunded >= session.amount_total) {
        if (order.status === "PENDING_PAYMENT") await paymentModel.adjustStock(order, "release", client);
        await paymentModel.update(id, { paymentStatus: "REFUNDED", ...(order.status === "PENDING_PAYMENT" ? { status: "CANCELLED" } : {}), paymentReviewRequired: order.status === "CONFIRMED" }, client);
      } else if (order.status === "PENDING_PAYMENT") {
        await paymentModel.adjustStock(order, "consume", client);
        await paymentModel.update(id, { status: "CONFIRMED", paymentStatus: "PAID", paymentReviewRequired: refunded > 0 }, client);
      } else if (order.status === "PAYMENT_EXPIRED") {
        await paymentModel.update(id, { status: "CANCELLED", paymentStatus: "REFUND_PENDING", paymentReviewRequired: true }, client);
      } else if (order.status === "CONFIRMED" && refunds.length) {
        const pending = refunds.some((refund) => refund.status === "pending" || refund.status === "requires_action");
        const failed = refunds.some((refund) => refund.status === "failed" || refund.status === "canceled");
        await paymentModel.update(id, { paymentReviewRequired: true, ...(pending ? { paymentStatus: "REFUND_PENDING" } : failed ? { paymentStatus: "REFUND_FAILED" } : {}) }, client);
      }
    } else if (session.status === "expired" && order.status === "PENDING_PAYMENT") {
      await paymentModel.adjustStock(order, "release", client);
      await paymentModel.update(id, { status: "PAYMENT_EXPIRED", paymentStatus: "UNPAID", stripeCheckoutUrl: null }, client);
    }
    if (eventId) await paymentModel.recordEvent(eventId, client);
  });
}

export async function paymentStatus(id: string, key: string) {
  const parsed = z.uuid().safeParse(key);
  if (!parsed.success) throw new HttpError(404, "Payment not found");
  const order = await paymentModel.find(id);
  if (!order.checkoutKeyHash || !timingSafeEqual(Buffer.from(order.checkoutKeyHash), Buffer.from(paymentHash(parsed.data)))) throw new HttpError(404, "Payment not found");
  return orderReceipt(order);
}

export async function processRefund(id: string) {
  let order = await paymentModel.find(id);
  if (order.status !== "CANCELLED" || !order.stripePaymentIntentId || !["REFUND_PENDING", "REFUND_FAILED"].includes(order.paymentStatus)) return;
  const refunds = await stripeGateway.refunds(order.stripePaymentIntentId);
  const succeeded = refunds.filter((refund) => refund.status === "succeeded").reduce((total, refund) => total + refund.amount, 0);
  const total = minorUnits(order.subtotal.add(order.deliveryCharge).toFixed(2));
  if (succeeded >= total) {
    await write(async (client) => {
      await paymentModel.update(id, { paymentStatus: "REFUNDED", stripeRefundId: refunds.find((refund) => refund.status === "succeeded")?.id }, client);
    });
    return;
  }
  if (succeeded > 0) {
    await write(async (client) => {
      await paymentModel.update(id, { paymentReviewRequired: true }, client);
    });
    return;
  }
  const pending = refunds.find((refund) => refund.status === "pending" || refund.status === "requires_action");
  if (pending) {
    await write(async (client) => {
      await paymentModel.update(id, { stripeRefundId: pending.id, paymentStatus: "REFUND_PENDING" }, client);
    });
    return;
  }
  const failed = refunds.find((refund) => refund.id === order.stripeRefundId && ["failed", "canceled"].includes(refund.status ?? ""));
  if (failed) {
    order = await write(async (client) => {
      const current = await paymentModel.find(id, client);
      if (current.stripeRefundId !== failed.id) return current;
      if (current.refundAttempt >= 4) return paymentModel.update(id, { paymentStatus: "REFUND_FAILED", paymentReviewRequired: true }, client);
      return paymentModel.update(id, { stripeRefundId: null, refundAttempt: { increment: 1 }, paymentStatus: "REFUND_PENDING" }, client);
    });
    if (order.paymentStatus === "REFUND_FAILED") return;
  }
  const refund = await stripeGateway.createRefund(order.stripePaymentIntentId!, id, order.refundAttempt);
  await write(async (client) => {
    const current = await paymentModel.find(id, client);
    if (current.paymentStatus === "REFUNDED" || current.refundAttempt !== order.refundAttempt) return;
    await paymentModel.update(
      id,
      {
        stripeRefundId: refund.id,
        paymentStatus: refund.status === "succeeded" ? "REFUNDED" : ["failed", "canceled"].includes(refund.status ?? "") ? "REFUND_FAILED" : "REFUND_PENDING",
      },
      client,
    );
  });
}

export async function cancelAndRefund(id: string) {
  await write(async (client) => {
    const order = await paymentModel.find(id, client);
    if (order.paymentMethod !== "STRIPE" || !["CONFIRMED", "CANCELLED"].includes(order.status)) throw new HttpError(409, "Only confirmed Stripe orders can be cancelled");
    if (order.status === "CONFIRMED") {
      await paymentModel.adjustStock(order, "restore", client);
      await paymentModel.update(id, { status: "CANCELLED", paymentStatus: order.paymentStatus === "REFUNDED" ? "REFUNDED" : "REFUND_PENDING", paymentReviewRequired: false }, client);
    }
  });
  try {
    await processRefund(id);
  } catch {}
  return orderReceipt(await paymentModel.find(id));
}

export async function handleStripeWebhook(body: Buffer, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripeGateway.verifyEvent(body, signature);
  } catch {
    throw new HttpError(400, "Invalid Stripe signature");
  }
  if (event.livemode) throw new HttpError(400, "Live Stripe events are not accepted");
  if (["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    await synchronizeSession(await stripeGateway.retrieveSession(session.id), event.id);
    const order = await paymentModel.findBySession(session.id);
    if (order?.paymentStatus === "REFUND_PENDING") await processRefund(order.id);
  } else if (["refund.created", "refund.updated", "refund.failed", "charge.refunded"].includes(event.type)) {
    const object = event.data.object as Stripe.Refund | Stripe.Charge;
    const paymentIntentId = intentId(object.payment_intent);
    const order = paymentIntentId ? await paymentModel.findByIntent(paymentIntentId) : null;
    if (order?.stripeSessionId) {
      await synchronizeSession(await stripeGateway.retrieveSession(order.stripeSessionId), event.id);
      await processRefund(order.id);
    }
  }
}

export async function reconcilePayments() {
  let after: string | undefined;
  let failures = 0;
  let reviewed = 0;
  for (;;) {
    const orders = await paymentModel.list(after);
    if (!orders.length) break;
    for (const order of orders) {
      try {
        let session = order.stripeSessionId ? await stripeGateway.retrieveSession(order.stripeSessionId) : await stripeGateway.findSession(order.id, order.createdAt);
        if (session?.status === "open" && order.paymentExpiresAt && order.paymentExpiresAt.getTime() <= Date.now()) session = await stripeGateway.expireSession(session.id);
        if (session) await synchronizeSession(session);
        else if (Date.now() - order.createdAt.getTime() >= 30 * 60_000) await expireUnpaidOrder(order.id);
        await processRefund(order.id);
        reviewed += 1;
      } catch {
        failures += 1;
      }
    }
    after = orders.at(-1)!.id;
  }
  return { reviewed, failures };
}
