import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCategories } from "@/services/server-api";
import type { CatalogueParams } from "@/store/api";
import { CategoryCatalogue } from "@/components/store/category-catalogue";

export const dynamic = "force-dynamic";
const findCategories = cache(getCategories);
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = (await findCategories()).items.find((category) => category.slug === slug);
  return {
    title: category?.name || "Category",
    alternates: { canonical: `/categories/${slug}` },
  };
}
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogueParams> }) {
  const { slug } = await params;
  const category = (await findCategories()).items.find((category) => category.slug === slug);
  if (!category) notFound();
  return <CategoryCatalogue slug={slug} params={await searchParams} />;
}
