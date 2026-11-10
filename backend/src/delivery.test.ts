import { describe, expect, it } from "vitest";
import { bangladeshDistricts, deliveryChargeFor, deliveryOptions } from "./utils/delivery.ts";
import { createOrderInput, orderEditInput, orderLookupInput } from "./validators/catalogue.validator.ts";

const item = { variantId: "00000000-0000-4000-8000-000000000001", quantity: 1 };

describe("Bangladesh delivery pricing", () => {
  it("provides every district once and applies the static rates", () => {
    expect(bangladeshDistricts).toHaveLength(64);
    expect(new Set(bangladeshDistricts).size).toBe(64);
    expect(deliveryChargeFor("Dhaka").toFixed(2)).toBe("80.00");
    expect(bangladeshDistricts.filter((district) => district !== "Dhaka").every((district) => deliveryChargeFor(district).toFixed(2) === "100.00")).toBe(true);
    expect(deliveryOptions).toHaveLength(64);
  });
});

describe("order delivery validation", () => {
  it("requires a listed district and four-digit postcode without accepting browser fees", () => {
    const order = {
      customerName: "Guest",
      email: "guest@example.com",
      phone: "+8801700000000",
      deliveryAddress: "12 Example Road",
      district: "Dhaka",
      postcode: "1200",
      items: [item],
    };
    expect(createOrderInput.safeParse(order).success).toBe(true);
    expect(createOrderInput.safeParse({ ...order, district: "Not a district" }).success).toBe(false);
    expect(createOrderInput.safeParse({ ...order, postcode: "12" }).success).toBe(false);
    expect(createOrderInput.safeParse({ ...order, deliveryCharge: "0" }).success).toBe(false);
  });

  it("allows legacy admin orders with no district and preserves nullable postcode", () => {
    expect(
      orderEditInput.safeParse({
        updatedAt: "2026-11-10T00:00:00.000Z",
        customerName: "Guest",
        email: "guest@example.com",
        phone: "+8801700000000",
        deliveryAddress: "12 Example Road",
        deliveryArea: "Old free-form area",
        district: null,
        postcode: null,
        customerNote: "",
        items: [item],
      }).success,
    ).toBe(true);
  });

  it("requires one contact detail for guest order lookup", () => {
    const orderNumber = "00000000-0000-4000-8000-000000000001";
    expect(orderLookupInput.safeParse({ orderNumber, email: "guest@example.com" }).success).toBe(true);
    expect(orderLookupInput.safeParse({ orderNumber, phone: "+8801700000000" }).success).toBe(true);
    expect(orderLookupInput.safeParse({ orderNumber }).success).toBe(false);
    expect(orderLookupInput.safeParse({ orderNumber, email: "guest@example.com", phone: "+8801700000000" }).success).toBe(false);
  });
});
