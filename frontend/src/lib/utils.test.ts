import { describe, expect, it } from "vitest";
import { money, slugify, errorMessage } from "./utils";
import { productSchema, variantSchema } from "../schemas/api";

describe("frontend-local catalogue contracts", () => {
  it("formats BDT instead of a different currency", () => {
    expect(money("1590")).toContain("1,590");
    expect(money("1590")).not.toContain("$");
  });
  it("generates SEO slugs", () => expect(slugify(" Everyday Oxford Shirt ")).toBe("everyday-oxford-shirt"));
  it("extracts API validation messages", () => expect(errorMessage({ data: { error: { message: "Duplicate SKU" } } })).toBe("Duplicate SKU"));
  it("rejects numeric amounts on the decimal-string wire contract", () =>
    expect(
      variantSchema.safeParse({
        id: "v",
        productId: "p",
        sku: "SKU",
        name: "M",
        price: 99,
        effectivePrice: "90.00",
        attributes: {},
        isDefault: true,
        isActive: true,
      }).success,
    ).toBe(false));
  it("requires a product category, variants and BDT currency", () => expect(productSchema.safeParse({ name: "Incomplete", currency: "USD" }).success).toBe(false));
});
