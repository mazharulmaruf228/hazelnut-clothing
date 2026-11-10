import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/services/server-api";
import { Catalogue, type CatalogueParams } from "@/components/store/catalogue";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).items.find((category) => category.slug === slug);
  return {
    title: category?.name || "Category",
    alternates: { canonical: `/categories/${slug}` },
  };
}
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogueParams> }) {
  const { slug } = await params;
  const category = (await getCategories()).items.find((category) => category.slug === slug);
  if (!category) notFound();
  return (
    <>
      <div className="mx-auto max-w-[1500px] px-[5%] pt-[35px] max-[700px]:pt-[25px]">
        <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">The collection</span>
        <h1 className="mt-2">{category.name}</h1>
        {category.description && <p className="text-muted">{category.description}</p>}
      </div>
      <Catalogue params={{ ...(await searchParams), category: slug }} />
    </>
  );
}
