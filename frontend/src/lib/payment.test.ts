import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addCartLine, settlePaidCart } from "./cart";
import { preparePaymentAttempt, savePaymentOrder, storedPaymentAttempt } from "./payment";

beforeEach(() => {
  for (const name of ["localStorage", "sessionStorage"]) {
    const values = new Map<string, string>();
    vi.stubGlobal(name, {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    });
  }
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("Stripe checkout browser persistence", () => {
  it("reuses unchanged checkout identity but not modified requests", () => {
    const fields = { email: "guest@example.com", items: [{ variantId: "variant", quantity: 1 }] };
    const first = preparePaymentAttempt(fields, fields.items);
    expect(preparePaymentAttempt(fields, fields.items).key).toBe(first.key);
    savePaymentOrder(first, "order");
    expect(storedPaymentAttempt()?.orderId).toBe("order");
    expect(preparePaymentAttempt({ ...fields, email: "changed@example.com" }, fields.items).key).not.toBe(first.key);
  });
  it("removes purchased quantities once while preserving newly added items", () => {
    addCartLine({ variantId: "first", productId: "product", slug: "shirt", productName: "Shirt", variantName: "M", sku: "SHIRT-M", unitPrice: "10", imageUrl: "", quantity: 3 });
    addCartLine({ variantId: "second", productId: "product", slug: "shirt", productName: "Shirt", variantName: "L", sku: "SHIRT-L", unitPrice: "10", imageUrl: "", quantity: 1 });
    settlePaidCart("order", [{ variantId: "first", quantity: 2 }]);
    const once = localStorage.getItem("hazelnut-cart");
    expect(JSON.parse(once!).lines.map((line: { quantity: number }) => line.quantity)).toEqual([1, 1]);
    settlePaidCart("order", [{ variantId: "first", quantity: 2 }]);
    expect(localStorage.getItem("hazelnut-cart")).toBe(once);
  });
});
