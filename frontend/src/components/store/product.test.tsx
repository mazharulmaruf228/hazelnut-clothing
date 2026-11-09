import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProductCard } from "./product-card";
import { ProductDetail } from "./product-detail";
import type { Product } from "../../schemas/api";
import { setCartQuantity } from "@/lib/cart";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const product: Product = {
  id: "product",
  name: "Cotton shirt",
  slug: "cotton-shirt",
  description: "A soft cotton shirt.",
  categoryId: "category",
  category: {
    id: "category",
    name: "Shirts",
    slug: "shirts",
    description: "",
    parentId: null,
  },
  status: "PUBLISHED",
  featured: true,
  price: "1000.00",
  discountPercentage: "10",
  fromPrice: "900.00",
  hasPriceRange: true,
  currency: "BDT",
  images: [],
  variants: [
    {
      id: "medium",
      productId: "product",
      name: "Medium",
      sku: "SHIRT-M",
      price: null,
      effectivePrice: "900.00",
      attributes: { size: "M", color: "White" },
      isActive: true,
      isDefault: true,
      inStock: true,
      availableQuantity: 8,
    },
    {
      id: "large",
      productId: "product",
      name: "Extra large",
      sku: "SHIRT-XL",
      price: "1200.00",
      effectivePrice: "1080.00",
      attributes: { size: "XL", color: "White" },
      isActive: true,
      isDefault: false,
      inStock: true,
      availableQuantity: 12,
    },
  ],
};
describe("public product controls", () => {
  it("starts with the active default variant", () => {
    render(<ProductDetail product={product} />);
    expect(screen.getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("SHIRT-M")).toBeVisible();
  });
  it("switches to the backend-computed override price and shareable variant URL", () => {
    render(<ProductDetail product={product} />);
    fireEvent.click(screen.getByRole("button", { name: "XL" }));
    expect(screen.getByText("SHIRT-XL")).toBeVisible();
    expect(screen.getByRole("button", { name: "XL" })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".detail-price")).toHaveTextContent("1,080");
    expect(window.location.search).toContain("variant=large");
  });
  it("honors a linked initial variant", () => {
    render(<ProductDetail product={product} initialVariant="large" />);
    expect(screen.getByText("SHIRT-XL")).toBeVisible();
  });
  it("caps product selection and cart quantity at available stock", () => {
    render(<ProductDetail product={product} />);
    const quantity = screen.getByRole("spinbutton", { name: "Quantity" });
    fireEvent.change(quantity, { target: { value: "10" } });
    expect(quantity).toHaveValue(8);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    setCartQuantity("medium", 10);
    expect(JSON.parse(localStorage.getItem("hazelnut-cart") || "[]")).toMatchObject([{ variantId: "medium", quantity: 8, availableQuantity: 8, unitPrice: "900.00" }]);
  });
  it("does not allow adding an unavailable variant", () => {
    const unavailable = { ...product, variants: product.variants.map((variant) => ({ ...variant, inStock: false, availableQuantity: 0 })) };
    render(<ProductDetail product={unavailable} />);
    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });
  it("uses the override original price, not an unrelated product base price", () => {
    const equalPrices = {
      ...product,
      fromPrice: "1080.00",
      hasPriceRange: false,
      variants: product.variants.map((variant) => ({
        ...variant,
        price: "1200.00",
        effectivePrice: "1080.00",
      })),
    };
    render(<ProductCard product={equalPrices} />);
    expect(document.querySelector("del")).toHaveTextContent("1,200");
  });
});
