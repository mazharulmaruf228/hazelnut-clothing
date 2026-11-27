"use client";

import Link from "next/link";
import { usePublicProductQuery } from "@/store/api";
import { ProductDetail } from "./product-detail";
import { CatalogueError, CatalogueLoading } from "./catalogue-status";

export function ProductContent({ slug, initialVariant }: { slug: string; initialVariant?: string }) {
  const { currentData: product, error, isFetching, refetch } = usePublicProductQuery(slug);
  if (error && "status" in error && error.status === 404) {
    return <p role="status" className="px-5 py-20 text-center">This product is no longer available. <Link href="/products">View the collection</Link></p>;
  }
  const feedback = error ? <CatalogueError error={error} retry={() => void refetch()} updating={isFetching} /> : isFetching ? <p role="status" className="py-3 text-center">Updating this product...</p> : null;
  if (!product) return error ? feedback : <CatalogueLoading />;
  return (
    <>
      {feedback}
      <nav className="mb-6 flex flex-wrap gap-2 text-[11px] text-muted max-[700px]:text-[10px]" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <ProductDetail key={slug} product={product} initialVariant={initialVariant} />
    </>
  );
}
