import { describe, expect, it } from "vitest";
import { effectivePrice, attributeKey } from "./utils/money.ts";
import { productInput, variantInput, listQuery, productPatch, variantPatch, categoryPatch } from "./validators/catalogue.validator.ts";

describe("catalogue pricing", () => {
  it("inherits base prices", () => expect(effectivePrice("1490.00", null, "10")).toBe("1341.00"));
  it("discounts overrides", () => expect(effectivePrice("1490", "1690", "15")).toBe("1436.50"));
  it("rounds only the final amount", () => expect(effectivePrice("100.05", null, "10")).toBe("90.05"));
  it("supports a full discount", () => expect(effectivePrice("99", null, "100")).toBe("0.00"));
});
describe("boundary validation", () => {
  it("does not inject create defaults into product patches", () =>
    expect(productPatch.parse({ name: "Updated" })).toEqual({
      name: "Updated",
    }));
  it("does not reset variant attributes or flags on patch", () =>
    expect(variantPatch.parse({ name: "Updated" })).toEqual({
      name: "Updated",
    }));
  it("does not clear category parent or description on patch", () =>
    expect(categoryPatch.parse({ name: "Updated" })).toEqual({
      name: "Updated",
    }));
  it("normalizes equivalent attribute maps", () => expect(attributeKey({ Size: " M ", Color: "Black" })).toBe(attributeKey({ color: "black", size: "m" })));
  it("rejects negative override prices", () => expect(variantInput.safeParse({ sku: "A", name: "Medium", price: "-1" }).success).toBe(false));
  it("caps public pagination", () => expect(listQuery.safeParse({ pageSize: 10000 }).success).toBe(false));
  it("rejects role injection on product forms", () => expect(productInput.safeParse({ role: "ADMIN" }).success).toBe(false));
});
