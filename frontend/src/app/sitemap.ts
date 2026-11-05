import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/services/server-api";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [{ url: origin }, { url: `${origin}/products` }];
  const categories = await getCategories();
  entries.push(
    ...categories.items.map((category) => ({
      url: `${origin}/categories/${category.slug}`,
    })),
  );
  for (let page = 1; ; page++) {
    const products = await getProducts(`pageSize=100&page=${page}`);
    entries.push(
      ...products.items.map((product) => ({
        url: `${origin}/products/${product.slug}`,
      })),
    );
    if (page >= products.totalPages) break;
  }
  return entries;
}
