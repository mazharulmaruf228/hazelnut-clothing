import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/schemas/api";
import { money } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images.find((image) => !image.variantId) ?? product.images[0];
  const cheapest = product.variants.find((variant) => variant.isActive && variant.effectivePrice === product.fromPrice);
  const originalPrice = cheapest?.price ?? product.price;
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-image">
        {image ? <Image src={image.imageUrl} alt={image.alt || product.name} fill sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 25vw" loading={priority ? "eager" : "lazy"} /> : <span className="image-missing">{product.name}</span>}
        {Number(product.discountPercentage) > 0 && <span className="product-badge">-{product.discountPercentage}%</span>}
        <span className="product-open" aria-hidden="true">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="product-caption">
        <span className="eyebrow">{product.category.name}</span>
        <Link href={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <p>
          {product.hasPriceRange && <span className="muted">From </span>}
          {money(product.fromPrice)}
          {Number(product.discountPercentage) > 0 && !product.hasPriceRange && <del>{money(originalPrice)}</del>}
        </p>
        <span className="muted variant-note">{product.variants.length} options</span>
      </div>
    </article>
  );
}
