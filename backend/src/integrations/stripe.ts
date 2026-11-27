import Stripe from "stripe";
import { config } from "../config/env.ts";
import { minorUnits } from "../utils/payment.ts";

let client: Stripe | undefined;
function stripe() {
  if (!config.STRIPE_SECRET_KEY) throw new Error("Stripe credentials are not configured");
  return (client ??= new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: "2026-11-18.endive", maxNetworkRetries: 2, timeout: 20000 }));
}

type CheckoutOrder = {
  id: string;
  email: string;
  currency: string;
  paymentExpiresAt: Date;
  deliveryCharge: string;
  items: { productName: string; variantName: string; unitPrice: string; quantity: number }[];
};

export const stripeGateway = {
  createSession: (order: CheckoutOrder) =>
    stripe().checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "hosted_page",
        allowed_payment_method_types: ["card"],
        managed_payments: { enabled: false },
        adaptive_pricing: { enabled: false },
        integration_identifier: "hazelnut_checkout_qmzrtnvp",
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        payment_intent_data: { metadata: { orderId: order.id } },
        customer_email: order.email,
        expires_at: Math.floor(order.paymentExpiresAt.getTime() / 1000),
        success_url: `${config.PUBLIC_ORIGIN}/order-placed?order=${order.id}&payment=stripe`,
        cancel_url: `${config.PUBLIC_ORIGIN}/checkout?payment=cancelled`,
        line_items: [
          ...order.items.map((item) => ({
            price_data: { currency: order.currency, unit_amount: minorUnits(item.unitPrice), product_data: { name: `${item.productName} - ${item.variantName}`.slice(0, 250) } },
            quantity: item.quantity,
          })),
          ...(minorUnits(order.deliveryCharge) ? [{ price_data: { currency: order.currency, unit_amount: minorUnits(order.deliveryCharge), product_data: { name: "Delivery" } }, quantity: 1 }] : []),
        ],
      },
      { idempotencyKey: `checkout:${order.id}` },
    ),
  retrieveSession: (id: string) => stripe().checkout.sessions.retrieve(id),
  expireSession: (id: string) => stripe().checkout.sessions.expire(id),
  findSession: async (orderId: string, createdAt: Date) => {
    const matches: Stripe.Checkout.Session[] = [];
    for await (const session of stripe().checkout.sessions.list({ created: { gte: Math.floor(createdAt.getTime() / 1000) - 1 }, limit: 100 })) {
      if (session.client_reference_id === orderId) matches.push(session);
    }
    if (matches.length > 1) throw new Error("Multiple Checkout Sessions require investigation");
    return matches[0] ?? null;
  },
  refunds: async (paymentIntentId: string) => {
    const result: Stripe.Refund[] = [];
    for await (const refund of stripe().refunds.list({ payment_intent: paymentIntentId, limit: 100 })) result.push(refund);
    return result;
  },
  createRefund: (paymentIntentId: string, orderId: string, attempt: number) => stripe().refunds.create({ payment_intent: paymentIntentId, metadata: { orderId } }, { idempotencyKey: `refund:${orderId}:${attempt}` }),
  verifyEvent: (body: Buffer, signature: string) => Stripe.webhooks.constructEvent(body, signature, config.STRIPE_WEBHOOK_SECRET),
};
