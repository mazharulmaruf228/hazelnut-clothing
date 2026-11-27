"use client";

import { usePublicCategoriesQuery, type CatalogueParams } from "@/store/api";
import { Catalogue } from "./catalogue";
import { CatalogueError, CatalogueLoading } from "./catalogue-status";

export function CategoryCatalogue({ slug, params }: { slug: string; params: CatalogueParams }) {
  const { currentData, error, isFetching, refetch } = usePublicCategoriesQuery();
  if (!currentData) {
    return error ? <CatalogueError error={error} retry={() => void refetch()} updating={isFetching} /> : <CatalogueLoading />;
  }
  const category = currentData.items.find((item) => item.slug === slug);
  if (!category) return <p role="status" className="px-5 py-20 text-center">This category is no longer available.</p>;
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-[5%] pt-[35px] max-[700px]:pt-[25px]">
        <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">The collection</span>
        <h1 className="mt-2">{category.name}</h1>
        {category.description && <p className="text-muted">{category.description}</p>}
      </div>
      <Catalogue params={{ ...params, category: slug }} />
    </>
  );
}
