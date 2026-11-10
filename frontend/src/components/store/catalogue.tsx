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
      <section className="catalogue-unavailable grid min-h-[250px] place-items-center px-5 py-20 text-center">
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
    <section className="mx-auto max-w-[1500px] px-[5%] pt-[38px] pb-[65px] max-[700px]:pt-[27px] max-[700px]:pb-10" id="collection">
      <div className="mb-7 flex items-end justify-between border-b border-line pb-6 max-[700px]:mb-[18px] max-[700px]:pb-[18px]">
        <div>
          <h2 className="mt-[7px]">{selected?.name || "The collection"}</h2>
        </div>
        <span className="text-xs text-muted">{products.total} pieces</span>
      </div>
      <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-[38px] max-[1000px]:grid-cols-[140px_minmax(0,1fr)] max-[1000px]:gap-[22px] max-[700px]:grid-cols-1 max-[700px]:gap-0">
        <aside className="max-[700px]:mb-[18px] max-[700px]:flex max-[700px]:gap-5 max-[700px]:overflow-auto max-[700px]:pb-2">
          <h3 className="mt-2 mb-[18px] flex items-center gap-2 text-xs max-[700px]:hidden">
            <SlidersHorizontal size={16} /> Categories
          </h3>
          <Link
            href={link({ category: "", page: "1" })}
            className={`flex justify-between border-b border-[#e8ebe6] py-[11px] text-xs max-[700px]:shrink-0 max-[700px]:gap-2 max-[700px]:whitespace-nowrap max-[700px]:py-1 ${!selected ? "font-[650] text-green max-[700px]:border-green" : "text-muted max-[700px]:border-transparent"}`}
          >
            All pieces <ArrowRight className="max-[700px]:hidden" size={14} />
          </Link>
          {categories.items.map((category) => (
            <Link
              key={category.id}
              href={link({ category: category.slug, page: "1" })}
              className={`flex justify-between border-b border-[#e8ebe6] py-[11px] text-xs max-[700px]:shrink-0 max-[700px]:gap-2 max-[700px]:whitespace-nowrap max-[700px]:py-1 ${selected?.id === category.id ? "font-[650] text-green max-[700px]:border-green" : "text-muted max-[700px]:border-transparent"}`}
            >
              {category.parentId ? <span className="pl-3 max-[700px]:pl-0">{category.name}</span> : category.name}
              <span className="max-[700px]:hidden">{category._count?.products || ""}</span>
            </Link>
          ))}
          <div className="mt-9 border-t border-line pt-5 max-[700px]:hidden">
            <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">Less, but better.</span>
            <p className="mt-[10px] max-w-[160px] font-editorial text-2xl leading-[1.2]">Find the pieces that feel like you.</p>
          </div>
        </aside>
        <div className="min-w-0">
          <CatalogueToolbar params={params} />
          {params.q && (
            <p className="mb-5 text-[13px]">
              Results for &ldquo;{params.q}&rdquo;{" "}
              <Link className="ml-3 underline" href={link({ q: "", page: "1" })}>
                Clear search
              </Link>
            </p>
          )}
          {products.items.length ? (
            <div className="grid grid-cols-3 gap-x-[22px] gap-y-8 min-[1500px]:grid-cols-4 max-[1000px]:grid-cols-2 max-[700px]:gap-x-3 max-[700px]:gap-y-[23px]">
              {products.items.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
              <h3>No pieces found.</h3>
              <p>Try a different search or category.</p>
              <Link href="/products">
                View all pieces <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {products.totalPages > 1 && (
            <nav className="mt-[35px] flex items-center justify-between border-t border-line pt-5 text-xs max-[700px]:text-[11px]" aria-label="Product pages">
              {products.page > 1 ? (
                <Link className="flex items-center gap-2" href={link({ page: String(products.page - 1) })}>
                  <ArrowLeft size={16} /> Previous
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {products.page} of {products.totalPages}
              </span>
              {products.page < products.totalPages ? (
                <Link className="flex items-center gap-2" href={link({ page: String(products.page + 1) })}>
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
