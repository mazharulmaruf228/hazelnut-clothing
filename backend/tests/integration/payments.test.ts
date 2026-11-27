import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.ts";
import { db } from "../../src/config/database.ts";
import { config } from "../../src/config/env.ts";
import { stripeGateway } from "../../src/integrations/stripe.ts";
import { createOrder } from "../../src/services/order.service.ts";
import { cancelAndRefund, reconcilePayments } from "../../src/services/payment.service.ts";
import { createOrderInput } from "../../src/validators/catalogue.validator.ts";

const sessions = new Map<string, Stripe.Checkout.Session>();
const refunds = new Map<string, Stripe.Refund[]>();
const admin = request.agent(app);
const editor = request.agent(app);
let adminHeaders: Record<string, string>;
let editorHeaders: Record<string, string>;
let categoryId: string;
let variantId: string;
const original = { enabled: config.STRIPE_ENABLED, signing: config.STRIPE_WEBHOOK_SECRET };

const createSession = vi.spyOn(stripeGateway, "createSession").mockImplementation(async (order) => {
  const previous = [...sessions.values()].find((session) => session.client_reference_id === order.id);
  if (previous) return previous as Stripe.Response<Stripe.Checkout.Session>;
  const session = {
    id: `cs_test_${order.id}`,
    object: "checkout.session",
    livemode: false,
    mode: "payment",
    currency: "bdt",
    amount_total: 278000,
    status: "open",
    payment_status: "unpaid",
    payment_intent: null,
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    url: "https://checkout.stripe.com/c/pay/test_fixture",
  } as Stripe.Checkout.Session;
  sessions.set(session.id, session);
  return session as Stripe.Response<Stripe.Checkout.Session>;
});
vi.spyOn(stripeGateway, "retrieveSession").mockImplementation(async (id) => sessions.get(id)! as Stripe.Response<Stripe.Checkout.Session>);
vi.spyOn(stripeGateway, "findSession").mockImplementation(async (id) => [...sessions.values()].find((session) => session.client_reference_id === id) ?? null);
vi.spyOn(stripeGateway, "expireSession").mockImplementation(async (id) => {
  const session = sessions.get(id)!;
  session.status = "expired";
  return session as Stripe.Response<Stripe.Checkout.Session>;
});
vi.spyOn(stripeGateway, "refunds").mockImplementation(async (id) => refunds.get(id) ?? []);
const refundPayment = vi.spyOn(stripeGateway, "createRefund").mockImplementation(async (intent, id) => {
  const previous = refunds.get(intent)?.find((refund) => refund.status === "succeeded");
  if (previous) return previous as Stripe.Response<Stripe.Refund>;
  const refund = { id: `re_${id}`, amount: 278000, currency: "bdt", payment_intent: intent, status: "succeeded" } as Stripe.Refund;
  refunds.set(intent, [refund]);
  return refund as Stripe.Response<Stripe.Refund>;
});

async function login(agent: typeof admin, email: string) {
  const csrf = await agent.get("/api/auth/csrf");
  const headers = { origin: config.PUBLIC_ORIGIN, "x-csrf-token": csrf.body.token };
  expect((await agent.post("/api/auth/login").set(headers).send({ email, password: "payments-test-password" })).status).toBe(200);
  return headers;
}

function input(key = randomUUID()) {
  return createOrderInput.parse({
    paymentMethod: "STRIPE",
    checkoutKey: key,
    customerName: "Stripe Guest",
    email: "stripe@test.invalid",
    phone: "+8801700000000",
    deliveryAddress: "12 Example Road",
    district: "Dhaka",
    postcode: "1200",
    items: [{ variantId, quantity: 3 }],
  });
}

function pay(id: string) {
  const session = sessions.get(`cs_test_${id}`)!;
  Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: `pi_${id}` });
  return session;
}

async function webhook(session: Stripe.Checkout.Session, eventId = `evt_${randomUUID()}`, type = "checkout.session.completed") {
  const body = JSON.stringify({ id: eventId, object: "event", type, livemode: false, data: { object: session } });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: config.STRIPE_WEBHOOK_SECRET });
  return request(app).post("/api/webhooks/stripe").set("content-type", "application/json").set("stripe-signature", signature).send(body);
}

beforeAll(async () => {
  if (!new URL(config.DATABASE_URL).pathname.endsWith("_test")) throw new Error("Test database required");
  await db.$executeRawUnsafe('TRUNCATE "OrderItem", "Order", "PaymentEvent", "ProductImage", "ProductVariant", "Product", "Category", "AdminSession", "OAuthIdentity", "AdminUser" CASCADE');
  config.STRIPE_ENABLED = true;
  config.STRIPE_WEBHOOK_SECRET = "whsec_payment_integration_fixture";
  const passwordHash = await argon2.hash("payments-test-password");
  for (const role of ["ADMIN", "EDITOR"] as const) {
    await db.adminUser.create({ data: { email: `${role.toLowerCase()}@payments.test`, name: role, role, isActive: true, approvedAt: new Date(), passwordHash } });
  }
  adminHeaders = await login(admin, "admin@payments.test");
  editorHeaders = await login(editor, "editor@payments.test");
  categoryId = (await db.category.create({ data: { name: "Payment fixtures", slug: "payment-fixtures" } })).id;
});

beforeEach(async () => {
  const product = await db.product.create({
    data: {
      name: "Payment Shirt",
      slug: randomUUID(),
      description: "Fixture",
      categoryId,
      status: "PUBLISHED",
      price: "1000",
      discountPercentage: "10",
      variants: { create: { name: "Medium", sku: randomUUID(), attributes: {}, isDefault: true, stockOnHand: 10 } },
    },
    include: { variants: true },
  });
  variantId = product.variants[0].id;
  createSession.mockClear();
  refundPayment.mockClear();
});

afterAll(async () => {
  config.STRIPE_ENABLED = original.enabled;
  config.STRIPE_WEBHOOK_SECRET = original.signing;
  vi.restoreAllMocks();
  await db.$disconnect();
});

describe.sequential("Stripe lifecycle with real PostgreSQL and signed HTTP webhooks", () => {
  it("reuses one order and reservation for concurrent identical checkout requests", async () => {
    const details = input();
    const [first, second] = await Promise.all([createOrder(details), createOrder(details)]);
    expect(first.id).toBe(second.id);
    expect(first).toMatchObject({ status: "PENDING_PAYMENT", paymentMethod: "STRIPE", paymentStatus: "PENDING", total: "2780.00" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockReserved).toBe(3);
    await expect(createOrder({ ...details, customerName: "Changed" })).rejects.toMatchObject({ status: 409 });
  });
  it("confirms and consumes stock once for duplicate and concurrent paid events", async () => {
    const order = await createOrder(input());
    const session = pay(order.id);
    const eventId = `evt_${randomUUID()}`;
    const results = await Promise.all([webhook(session, eventId), webhook(session, eventId), webhook(session)]);
    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({ stockReserved: 0, stockOnHand: 7 });
    expect((await admin.patch(`/api/admin/orders/${order.id}/status`).set(adminHeaders).send({ status: "CONFIRMED" })).status).toBe(409);
  });
  it("does not trust unpaid completion and releases expired reservations exactly once", async () => {
    const order = await createOrder(input());
    const session = sessions.get(`cs_test_${order.id}`)!;
    expect((await webhook(session)).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
    session.status = "expired";
    expect((await webhook(session, undefined, "checkout.session.expired")).status).toBe(200);
    expect((await webhook(session, undefined, "checkout.session.expired")).status).toBe(200);
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({ stockReserved: 0, stockOnHand: 10 });
  });
  it("rejects forged Stripe totals without consuming inventory", async () => {
    const order = await createOrder(input());
    const session = pay(order.id);
    session.amount_total = 1;
    expect((await webhook(session)).status).toBe(409);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockReserved).toBe(3);
    session.amount_total = 278000;
    expect((await webhook(session)).status).toBe(200);
  });
  it("protects guest payment status and omits payment secrets from order lookup", async () => {
    const details = input();
    const order = await createOrder(details);
    expect((await request(app).get(`/api/orders/${order.id}/payment`).set("authorization", `Bearer ${randomUUID()}`)).status).toBe(404);
    const status = await request(app).get(`/api/orders/${order.id}/payment`).set("authorization", `Bearer ${details.checkoutKey}`);
    expect(status.status).toBe(200);
    expect(status.body).not.toHaveProperty("email");
    const lookup = await request(app).post("/api/orders/lookup").send({ orderNumber: order.id, email: details.email });
    expect(lookup.status).toBe(200);
    expect(lookup.body).not.toHaveProperty("checkoutKeyHash");
    expect(lookup.body).not.toHaveProperty("stripeSessionId");
  });
  it("restricts cancellation to admins, restores once and refunds once", async () => {
    const order = await createOrder(input());
    expect((await webhook(pay(order.id))).status).toBe(200);
    expect((await editor.post(`/api/admin/orders/${order.id}/cancel-refund`).set(editorHeaders).send({ notShipped: true })).status).toBe(403);
    expect((await admin.post(`/api/admin/orders/${order.id}/cancel-refund`).set(adminHeaders).send({ notShipped: false })).status).toBe(400);
    const results = await Promise.all([cancelAndRefund(order.id), cancelAndRefund(order.id)]);
    expect(results.every((result) => result.status === "CANCELLED")).toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("REFUNDED");
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({ stockReserved: 0, stockOnHand: 10 });
    expect((await webhook(pay(order.id))).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect(refunds.get(`pi_${order.id}`)).toHaveLength(1);
  });
  it("persists cancellation across a refund timeout and recovers on reconciliation", async () => {
    const order = await createOrder(input());
    expect((await webhook(pay(order.id))).status).toBe(200);
    refundPayment.mockRejectedValueOnce(new Error("provider timeout"));
    expect(await cancelAndRefund(order.id)).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUND_PENDING" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockOnHand).toBe(10);
    await reconcilePayments();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("REFUNDED");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockOnHand).toBe(10);
  });
  it("recovers an ambiguous session-creation response without another reservation", async () => {
    const details = input();
    createSession.mockRejectedValueOnce(new Error("connection lost"));
    await expect(createOrder(details)).rejects.toMatchObject({ status: 503 });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockReserved).toBe(3);
    const order = await createOrder(details);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockReserved).toBe(3);
  });
  it("refunds an anomalous late payment without consuming released stock", async () => {
    const order = await createOrder(input());
    const session = sessions.get(`cs_test_${order.id}`)!;
    session.status = "expired";
    await webhook(session, undefined, "checkout.session.expired");
    expect((await webhook(pay(order.id))).status).toBe(200);
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({ stockReserved: 0, stockOnHand: 10 });
  });
  it("releases a reservation after a definitive session-creation rejection", async () => {
    createSession.mockRejectedValueOnce({ type: "StripeInvalidRequestError" });
    await expect(createOrder(input())).rejects.toMatchObject({ status: 503 });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({ stockReserved: 0, stockOnHand: 10 });
  });
  it("flags external partial refunds and never silently restocks or sends another refund", async () => {
    const order = await createOrder(input());
    const session = pay(order.id);
    await webhook(session);
    refunds.set(`pi_${order.id}`, [{ id: `re_partial_${order.id}`, amount: 100, status: "succeeded", payment_intent: `pi_${order.id}` } as Stripe.Refund]);
    await webhook(session);
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ paymentReviewRequired: true, status: "CONFIRMED" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockOnHand).toBe(7);
    expect(refundPayment).not.toHaveBeenCalled();
  });
  it("never automatically retries an external failed refund on an uncancelled order", async () => {
    const order = await createOrder(input());
    const session = pay(order.id);
    await webhook(session);
    refunds.set(`pi_${order.id}`, [{ id: `re_failed_${order.id}`, amount: 100, status: "failed", payment_intent: `pi_${order.id}` } as Stripe.Refund]);
    expect((await webhook(session, undefined, "refund.failed")).status).toBe(200);
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "CONFIRMED", paymentStatus: "REFUND_FAILED", paymentReviewRequired: true });
    expect(refundPayment).not.toHaveBeenCalled();
  });
});
