import { describe, expect, it } from "vitest";
import { checkoutInputHash, minorUnits, paymentHash } from "./utils/payment.ts";
import Stripe from "stripe";
import request from "supertest";
import { app } from "./app.ts";
import { config } from "./config/env.ts";

describe("Stripe payment amounts and request identity", () => {
  it("converts BDT to exact integer poisha", () => {
    expect(minorUnits("2780.00")).toBe(278000);
    expect(minorUnits("0.29")).toBe(29);
    expect(minorUnits("9999999999.99")).toBe(999999999999);
    expect(() => minorUnits("1.001")).toThrow();
    expect(() => minorUnits("-1")).toThrow();
  });
  it("hashes normalized requests without storing the checkout access key", () => {
    const fields = { email: "guest@example.com", items: [{ variantId: "variant", quantity: 1 }] };
    expect(checkoutInputHash({ ...fields, checkoutKey: "first" })).toBe(checkoutInputHash({ checkoutKey: "second", ...fields }));
    expect(checkoutInputHash(fields)).not.toBe(checkoutInputHash({ ...fields, items: [{ variantId: "variant", quantity: 2 }] }));
    expect(paymentHash("key")).toHaveLength(64);
  });
  it("verifies Stripe signatures against the original raw bytes", async () => {
    const previous = config.STRIPE_WEBHOOK_SECRET;
    config.STRIPE_WEBHOOK_SECRET = "whsec_signature_test_fixture";
    try {
      const body = JSON.stringify({ id: "evt_fixture", object: "event", type: "unhandled.fixture", livemode: false, data: { object: {} } });
      const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: config.STRIPE_WEBHOOK_SECRET });
      expect((await request(app).post("/api/webhooks/stripe").set("content-type", "application/json").set("stripe-signature", signature).send(body)).status).toBe(200);
      expect((await request(app).post("/api/webhooks/stripe").set("content-type", "application/json").set("stripe-signature", signature).send(body.replace("evt_fixture", "evt_tampered"))).status).toBe(400);
      expect((await request(app).post("/api/webhooks/stripe").send({})).status).toBe(400);
    } finally {
      config.STRIPE_WEBHOOK_SECRET = previous;
    }
  });
});
