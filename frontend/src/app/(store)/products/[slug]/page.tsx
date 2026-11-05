import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct, ApiError } from "@/services/server-api";
import { ProductDetail } from "@/components/store/product-detail";

export const dynamic = "force-dynamic";
async function findProduct(slug: string) {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProduct(slug);
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      images: product.images.slice(0, 1).map((image) => image.imageUrl),
    },
  };
}
export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ variant?: string }> }) {
  const { slug } = await params;
  const product = await findProduct(slug);
  const { variant } = await searchParams;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name,
    description: product.description,
    productGroupID: product.id,
    image: product.images.map((image) => image.imageUrl),
    hasVariant: product.variants.map((item) => ({
      "@type": "Product",
      name: `${product.name} - ${item.name}`,
      sku: item.sku,
      image: product.images[0]?.imageUrl,
      offers: {
        "@type": "Offer",
        price: item.effectivePrice,
        priceCurrency: "BDT",
        url: `${origin}/products/${slug}?variant=${item.id}`,
      },
    })),
  };
  return (
    <div className="detail-container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ProductDetail product={product} initialVariant={variant} />
    </div>
  );
}
