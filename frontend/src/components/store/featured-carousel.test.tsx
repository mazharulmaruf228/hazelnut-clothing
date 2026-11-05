import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FeaturedCarousel } from "./featured-carousel";
import type { Product } from "@/schemas/api";

const { autoplayOptions, autoplayPlay, autoplayStop, emblaApi } = vi.hoisted(() => ({
  autoplayOptions: {} as Record<string, unknown>,
  autoplayPlay: vi.fn(),
  autoplayStop: vi.fn(),
  emblaApi: {
    selectedScrollSnap: () => 0,
    on: vi.fn(),
    off: vi.fn(),
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
    scrollTo: vi.fn(),
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string; priority?: boolean }) => <span role="img" aria-label={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), emblaApi],
}));
vi.mock("embla-carousel-autoplay", () => ({
  default: (options: Record<string, unknown>) => {
    Object.assign(autoplayOptions, options);
    return { play: autoplayPlay, stop: autoplayStop };
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const product: Product = {
  id: "product-1",
  name: "Everyday Oxford Shirt",
  slug: "everyday-oxford-shirt",
  description: "A clean cotton shirt for everyday wear.",
  categoryId: "shirts",
  category: { id: "shirts", name: "Shirts", slug: "shirts", description: "", parentId: null },
  status: "PUBLISHED",
  featured: true,
  price: "1890.00",
  discountPercentage: "10",
  fromPrice: "1701.00",
  hasPriceRange: false,
  currency: "BDT",
  variants: [],
  images: [],
};

function setMotionPreference(reduced: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => setMotionPreference(false));

describe("featured carousel", () => {
  it("autoplays every five seconds when reduced motion is not requested and pauses on focus", async () => {
    setMotionPreference(false);
    render(<FeaturedCarousel products={[product, { ...product, id: "product-2", name: "Cotton Tee", slug: "cotton-tee" }]} />);

    await waitFor(() => expect(autoplayPlay).toHaveBeenCalled());
    expect(autoplayOptions.delay).toBe(5000);
    autoplayPlay.mockClear();
    fireEvent.focus(screen.getByRole("region", { name: "Featured products" }));
    await waitFor(() => expect(autoplayStop).toHaveBeenCalled());
    const resume = screen.getByRole("button", { name: "Start automatic rotation" });
    expect(resume).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(resume);
    await waitFor(() => expect(autoplayPlay).toHaveBeenCalled());
  });

  it("starts paused for reduced motion and allows explicit rotation", async () => {
    setMotionPreference(true);
    render(<FeaturedCarousel products={[product, { ...product, id: "product-2" }]} />);

    expect(autoplayPlay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start automatic rotation" }));
    await waitFor(() => expect(autoplayPlay).toHaveBeenCalled());
  });

  it("hides carousel controls for a single featured product", () => {
    setMotionPreference(false);
    render(<FeaturedCarousel products={[product]} />);

    expect(screen.getByRole("group", { name: "1 of 1: Everyday Oxford Shirt" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Next featured product" })).not.toBeInTheDocument();
  });

  it("shows an empty state without carousel controls", () => {
    render(<FeaturedCarousel products={[]} />);

    expect(screen.getByText("No featured pieces at the moment.")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Featured products" })).not.toBeInTheDocument();
  });
});