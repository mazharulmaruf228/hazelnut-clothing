import Link from "next/link";
import { ArrowLeft, ArrowRight, SlidersHorizontal, RotateCcw } from "lucide-react";
import { getCategories, getProducts } from "@/services/server-api";
import { ProductCard } from "./product-card";
import { Button } from "@/components/ui/button";
import { CatalogueToolbar } from "./catalogue-toolbar";
import { FeaturedCarousel } from "./featured-carousel";

export type CatalogueParams = {
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
  featured?: string;
};
export async function Catalogue({ params, featuredCarousel = false }: { params: CatalogueParams; featuredCarousel?: boolean }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  let result;
  try {
    result = await Promise.all([getProducts(query.toString()), getCategories()]);
  } catch {
    return (
      <section className="catalogue-unavailable">
        <h2>The collection will be back shortly.</h2>
        <p>We couldn&apos;t reach the catalogue. Please try again in a moment.</p>
        <Button asChild variant="outline">
          <Link href="/products">
            <RotateCcw size={16} /> Try again
          </Link>
        </Button>
      </section>
    );
  }
  const [products, categories] = result;
  if (featuredCarousel) return <FeaturedCarousel products={products.items} />;
  const link = (changes: Record<string, string>) => {
    const next = new URLSearchParams(query);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `/products?${next}`;
  };
  const selected = categories.items.find((category) => category.slug === params.category);
  return (
    <section className="catalogue-section" id="collection">
      <div className="section-heading">
        <div>
          <h2>{selected?.name || "The collection"}</h2>
        </div>
        <span className="muted">{products.total} pieces</span>
      </div>
      <div className="catalogue-layout">
        <aside className="category-sidebar">
          <h3>
            <SlidersHorizontal size={16} /> Categories
          </h3>
          <Link href={link({ category: "", page: "1" })} className={!selected ? "active" : ""}>
            All pieces <ArrowRight size={14} />
          </Link>
          {categories.items.map((category) => (
            <Link key={category.id} href={link({ category: category.slug, page: "1" })} className={selected?.id === category.id ? "active" : ""}>
              {category.parentId ? <span className="subcategory">{category.name}</span> : category.name}
              <span>{category._count?.products || ""}</span>
            </Link>
          ))}
          <div className="sidebar-note">
            <span className="eyebrow">Less, but better.</span>
            <p>Find the pieces that feel like you.</p>
          </div>
        </aside>
        <div className="catalogue-results">
          <CatalogueToolbar params={params} />
          {params.q && (
            <p className="search-summary">
              Results for &ldquo;{params.q}&rdquo; <Link href={link({ q: "", page: "1" })}>Clear search</Link>
            </p>
          )}
          {products.items.length ? (
            <div className="product-grid">
              {products.items.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No pieces found.</h3>
              <p>Try a different search or category.</p>
              <Link href="/products">
                View all pieces <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {products.totalPages > 1 && (
            <nav className="pagination" aria-label="Product pages">
              {products.page > 1 ? (
                <Link href={link({ page: String(products.page - 1) })}>
                  <ArrowLeft size={16} /> Previous
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {products.page} of {products.totalPages}
              </span>
              {products.page < products.totalPages ? (
                <Link href={link({ page: String(products.page + 1) })}>
                  Next <ArrowRight size={16} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
