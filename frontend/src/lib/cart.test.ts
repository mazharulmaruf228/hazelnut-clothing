import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addCartLine, captureCartSnapshot, removePurchasedQuantities, setCartQuantity, type CartLine } from "./cart";

const line: CartLine = { variantId: "variant", productId: "product", slug: "shirt", productName: "Shirt", variantName: "M", sku: "SKU", unitPrice: "100.00", imageUrl: "", quantity: 2 };
const originalLocks = Object.getOwnPropertyDescriptor(navigator, "locks");

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request: vi.fn(async (_name: string, operation: () => unknown) => operation()) } });
});

afterEach(() => {
  localStorage.clear();
  if (originalLocks) Object.defineProperty(navigator, "locks", originalLocks);
  else Reflect.deleteProperty(navigator, "locks");
});

describe("payment cart snapshots", () => {
  it("preserves quantities changed after an order was placed", async () => {
    await addCartLine(line);
    const snapshot = await captureCartSnapshot([{ variantId: "variant", quantity: 2 }]);
    await setCartQuantity("variant", 3);
    await removePurchasedQuantities(snapshot);
    expect(JSON.parse(localStorage.getItem("hazelnut-cart") ?? "[]")[0].quantity).toBe(3);
  });

  it("does not remove later items when two orders use the same snapshot", async () => {
    await addCartLine(line);
    const first = await captureCartSnapshot([{ variantId: "variant", quantity: 2 }]);
    const second = await captureCartSnapshot([{ variantId: "variant", quantity: 2 }]);
    await removePurchasedQuantities(first);
    await addCartLine({ ...line, quantity: 1 });
    await removePurchasedQuantities(second);
    await removePurchasedQuantities(first);
    expect(JSON.parse(localStorage.getItem("hazelnut-cart") ?? "[]")[0].quantity).toBe(1);
  });

  it("does not automatically remove items without cross-tab locking", async () => {
    Reflect.deleteProperty(navigator, "locks");
    await addCartLine(line);
    expect(await captureCartSnapshot([{ variantId: "variant", quantity: 2 }])).toEqual([]);
    await removePurchasedQuantities([{ variantId: "variant", quantity: 2, revision: "unknown" }]);
    expect(JSON.parse(localStorage.getItem("hazelnut-cart") ?? "[]")[0].quantity).toBe(2);
  });
});
