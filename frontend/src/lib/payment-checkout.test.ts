import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detachPaymentDraft, preparePaymentCheckout, readPaymentCheckout, readPaymentCheckouts, readGuestPaymentAccess, saveGuestPaymentAccess, savePaymentCheckout } from "./payment-checkout";

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("payment checkout storage", () => {
  it("preserves a legacy pending checkout when starting a new order", async () => {
    const legacy = { key: webcrypto.randomUUID(), fingerprint: "old", items: [{ variantId: "variant", quantity: 1 }], settled: false };
    sessionStorage.setItem("hazelnut-payment-checkout", JSON.stringify(legacy));
    const current = await preparePaymentCheckout({ customer: "new" }, [{ variantId: "other", quantity: 1 }]);
    expect(current.key).not.toBe(legacy.key);
    expect(readPaymentCheckouts()).toHaveLength(2);
    expect(readPaymentCheckouts()[0]).toMatchObject(legacy);
    expect(readPaymentCheckout()).toBeNull();
  });

  it("reuses an uncertain draft but creates independent keys for deliberate new orders", async () => {
    const items = [{ variantId: "variant", quantity: 1 }];
    const first = await preparePaymentCheckout({ customer: "same" }, items);
    expect((await preparePaymentCheckout({ customer: "same" }, items)).key).toBe(first.key);
    detachPaymentDraft();
    const second = await preparePaymentCheckout({ customer: "same" }, items);
    expect(second.key).not.toBe(first.key);
    const orderId = webcrypto.randomUUID();
    savePaymentCheckout({ ...second, draft: false, orderId });
    expect(readPaymentCheckout(orderId)?.key).toBe(second.key);
    saveGuestPaymentAccess(orderId, "status-token");
    expect(readGuestPaymentAccess(orderId)?.statusToken).toBe("status-token");
    expect(readPaymentCheckouts()).toHaveLength(2);
  });

  it("does not block a new order when many earlier checkouts are unresolved", async () => {
    const checkouts = Array.from({ length: 100 }, () => ({ key: webcrypto.randomUUID(), fingerprint: "previous", items: [], settled: false, draft: false }));
    sessionStorage.setItem("hazelnut-payment-checkout", JSON.stringify({ version: 2, checkouts, guestAccess: [] }));
    await preparePaymentCheckout({ customer: "new" }, []);
    expect(readPaymentCheckouts()).toHaveLength(101);
  });
});
