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
      <div className="page-intro">
        <span className="eyebrow">The collection</span>
        <h1>{category.name}</h1>
        {category.description && <p>{category.description}</p>}
      </div>
      <Catalogue params={{ ...(await searchParams), category: slug }} />
    </>
  );
}
