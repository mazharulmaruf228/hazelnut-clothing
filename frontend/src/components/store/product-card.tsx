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
    <article className="product-card-motion">
      <Link href={`/products/${product.slug}`} className="product-image-motion relative block aspect-[3/3.7] overflow-hidden rounded-[5px] bg-[#e8eae6] shadow-[0_8px_24px_rgba(32,48,37,0.07)] max-[700px]:aspect-[3/4]">
        {image ? <Image src={image.imageUrl} alt={image.alt || product.name} fill sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 25vw" loading={priority ? "eager" : "lazy"} /> : <span className="grid h-full place-items-center p-5 text-muted">{product.name}</span>}
        {Number(product.discountPercentage) > 0 && <span className="absolute left-3 top-3 bg-[#fffdf5e8] px-2 py-1 text-[10px] text-[#a34132] backdrop-blur-[6px] max-[700px]:left-2 max-[700px]:top-2 max-[700px]:text-[9px]">-{product.discountPercentage}%</span>}
        <span className="product-open-motion absolute right-3 bottom-3 grid h-[30px] w-[30px] place-items-center rounded-full bg-[#ffffffd9] backdrop-blur-[12px] max-[700px]:right-2 max-[700px]:bottom-2 max-[700px]:h-[25px] max-[700px]:w-[25px]" aria-hidden="true">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="relative pt-[14px]">
        <span className="text-[9px] text-muted">{product.category.name}</span>
        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-1 mb-1 text-[13px] font-medium max-[700px]:text-xs">{product.name}</h3>
        </Link>
        <p className="text-xs font-semibold max-[700px]:text-[11px]">
          {product.hasPriceRange && <span className="text-muted">From </span>}
          {money(product.fromPrice)}
          {Number(product.discountPercentage) > 0 && !product.hasPriceRange && <del className="ml-2 text-[11px] font-normal text-muted">{money(originalPrice)}</del>}
        </p>
        <span className="mt-[5px] block text-[10px] text-muted">{product.variants.length} options</span>
      </div>
    </article>
  );
}
