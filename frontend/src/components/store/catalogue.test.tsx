import type { ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { catalogueApi } from "@/store/api";
import type { Product } from "@/schemas/api";
import { Catalogue } from "./catalogue";
import { ProductContent } from "./product-content";
import { CategoryCatalogue } from "./category-catalogue";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./featured-carousel", () => ({
  FeaturedCarousel: ({ products }: { products: Product[] }) => <section aria-label="Featured products">{products.map((product) => <p key={product.id}>{product.name}</p>)}</section>,
}));

const product: Product = {
  id: "shirt",
  name: "Cotton shirt",
  slug: "cotton-shirt",
  description: "Soft cotton.",
  categoryId: "shirts",
  category: { id: "shirts", name: "Shirts", slug: "shirts", description: "Everyday shirts", parentId: null },
  status: "PUBLISHED",
  featured: true,
  price: "1000.00",
  discountPercentage: "0",
  fromPrice: "1000.00",
  hasPriceRange: false,
  currency: "BDT",
  images: [],
  variants: [{
    id: "medium",
    productId: "shirt",
    sku: "SHIRT-M",
    name: "Medium",
    price: null,
    effectivePrice: "1000.00",
    attributes: { size: "M" },
    isDefault: true,
    isActive: true,
    inStock: true,
    availableQuantity: 5,
  }],
};
const products = { items: [product], total: 1, page: 1, pageSize: 12, totalPages: 1 };
const categories = { items: [product.category] };
const fetchMock = vi.fn<typeof fetch>();
const NativeRequest = globalThis.Request;
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function requestUrl(input: RequestInfo | URL) {
  return new URL(input instanceof Request ? input.url : String(input));
}
function makeStore() {
  return configureStore({
    reducer: { [catalogueApi.reducerPath]: catalogueApi.reducer },
    middleware: (defaults) => defaults().concat(catalogueApi.middleware),
  });
}
let store: ReturnType<typeof makeStore>;
function wrapper({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
beforeEach(() => {
  store = makeStore();
  vi.stubGlobal("Request", class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(typeof input === "string" ? new URL(input, "http://localhost").href : input, init);
    }
  });
  fetchMock.mockImplementation(async (input) => {
    const path = requestUrl(input).pathname;
    return json(path === "/api/categories" ? categories : path === "/api/products" ? products : product);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  store.dispatch(catalogueApi.util.resetApiState());
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("browser catalogue queries", () => {
  it("reuses equivalent cached filters after unsubscribe and fetches new filters and explicit refetches", async () => {
    const first = store.dispatch(catalogueApi.endpoints.publicProducts.initiate({ q: "cotton", sort: "newest" }));
    await first.unwrap();
    first.unsubscribe();
    const cached = store.dispatch(catalogueApi.endpoints.publicProducts.initiate({ sort: "newest", q: "cotton", category: "" }));
    await cached.unwrap();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await store.dispatch(catalogueApi.endpoints.publicProducts.initiate({ q: "denim" })).unwrap();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await cached.refetch().unwrap();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([input]) => requestUrl(input).search)).toEqual(["?q=cotton&sort=newest", "?q=denim", "?q=cotton&sort=newest"]);
  });

  it("separates product slug cache entries and encodes the requested slug", async () => {
    await store.dispatch(catalogueApi.endpoints.publicProduct.initiate("cotton shirt")).unwrap();
    await store.dispatch(catalogueApi.endpoints.publicProduct.initiate("cotton shirt")).unwrap();
    await store.dispatch(catalogueApi.endpoints.publicProduct.initiate("denim")).unwrap();
    expect(fetchMock.mock.calls.map(([input]) => requestUrl(input).pathname)).toEqual(["/api/products/cotton%20shirt", "/api/products/denim"]);
  });

  it("shows initial loading and fetches featured products without an unused categories request", async () => {
    render(<Catalogue params={{ featured: "true" }} featuredCarousel />, { wrapper });
    expect(screen.getByRole("status")).toHaveTextContent("Loading the collection");
    expect(await screen.findByText("Cotton shirt")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestUrl(fetchMock.mock.calls[0][0]).search).toBe("?featured=true");
  });

  it("shows an HTTP failure and retries the failed query rather than reloading the page", async () => {
    fetchMock.mockImplementation(async (input) => requestUrl(input).pathname === "/api/products" ? json({}, 503) : json(categories));
    render(<Catalogue params={{}} />, { wrapper });
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 503");
    fetchMock.mockImplementation(async (input) => json(requestUrl(input).pathname === "/api/products" ? products : categories));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Cotton shirt" })).toBeVisible();
    expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).pathname === "/api/categories")).toHaveLength(1);
  });

  it("reports schema failures explicitly and preserves conservative inventory defaults", async () => {
    fetchMock.mockResolvedValue(json({ ...product, currency: "USD" }));
    render(<ProductContent slug="cotton-shirt" />, { wrapper });
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid response");
    const { inStock, availableQuantity, ...legacyVariant } = product.variants[0];
    void inStock;
    void availableQuantity;
    fetchMock.mockResolvedValue(json({ ...product, variants: [legacyVariant] }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("does not show the previous filter's products while a new query is loading", async () => {
    const view = render(<Catalogue params={{ q: "cotton" }} />, { wrapper });
    expect(await screen.findByRole("heading", { name: "Cotton shirt" })).toBeVisible();
    let resolveRequest!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    view.rerender(<Catalogue params={{ q: "denim" }} />);
    expect(screen.queryByRole("heading", { name: "Cotton shirt" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading the collection");
    await waitFor(() => expect(resolveRequest).toBeDefined());
    resolveRequest(json({ ...products, items: [], total: 0, totalPages: 0 }));
    expect(await screen.findByText("No pieces found.")).toBeVisible();
  });

  it("retains matching cached data when a background refresh fails", async () => {
    render(<Catalogue params={{ featured: "true" }} featuredCarousel />, { wrapper });
    expect(await screen.findByText("Cotton shirt")).toBeVisible();
    fetchMock.mockRejectedValue(new Error("Connection lost"));
    store.dispatch(catalogueApi.util.invalidateTags(["Catalogue"]));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the catalogue API");
    expect(screen.getByText("Cotton shirt")).toBeVisible();
  });

  it("loads category content from browser data and presents a deleted product clearly", async () => {
    const view = render(<CategoryCatalogue slug="shirts" params={{}} />, { wrapper });
    expect(await screen.findByRole("heading", { name: "Shirts" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Cotton shirt" })).toBeVisible();
    expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).pathname === "/api/categories")).toHaveLength(1);
    fetchMock.mockResolvedValue(json({}, 404));
    view.rerender(<ProductContent slug="deleted-shirt" />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("This product is no longer available"));
  });
});
