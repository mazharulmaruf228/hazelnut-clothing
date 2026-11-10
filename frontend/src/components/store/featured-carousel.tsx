"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Product } from "@/schemas/api";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FeaturedCarousel({ products }: { products: Product[] }) {
  const [autoplay] = useState(() => Autoplay({ delay: 5000, playOnInit: false, stopOnInteraction: false, stopOnMouseEnter: false, stopOnFocusIn: false }));
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: products.length > 1, align: "start", duration: 70 }, [autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const shouldRotate = products.length > 1 && !reducedMotion && !pointerInside && !focusWithin;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setReducedMotion(preference.matches);
    };
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const updateSelectedIndex = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    updateSelectedIndex();
    emblaApi.on("select", updateSelectedIndex);
    return () => {
      emblaApi.off("select", updateSelectedIndex);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (shouldRotate) autoplay.play();
    else autoplay.stop();
  }, [autoplay, shouldRotate]);

  if (products.length === 0) {
    return (
      <section className="mx-auto min-h-[280px] max-w-[1500px] px-[5%] pt-[38px] pb-[65px] max-[700px]:pt-[27px] max-[700px]:pb-10" id="collection">
        <h2>The collection</h2>
        <p className="mt-3 text-muted">No featured pieces at the moment.</p>
      </section>
    );
  }

  return (
    <section
      className="mx-auto max-w-[1540px] px-[5%] pt-[38px] pb-[65px] max-[700px]:pt-[27px] max-[700px]:pb-10"
      id="collection"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      onPointerDown={() => setPointerInside(true)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
      }}
    >
      <div className="mb-[22px] flex items-end justify-between gap-5 border-b border-line pb-5 max-[700px]:mb-[15px] max-[700px]:pb-[15px]">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">The featured edit</span>
          <h2 className="mt-[6px]">The collection</h2>
        </div>
        <span className="text-muted">{products.length} pieces</span>
      </div>
      <div className="overflow-hidden rounded-[7px] border border-white/90 bg-white/60 shadow-[0_18px_48px_rgba(32,54,39,0.1)]" ref={viewportRef} aria-live={shouldRotate ? "off" : "polite"}>
        <div className="flex touch-pan-y">
          {products.map((product, index) => {
            const image = product.images.find((item) => !item.variantId) ?? product.images[0];
            const lowestVariant = product.variants.find((variant) => variant.isActive && variant.effectivePrice === product.fromPrice);
            const originalPrice = lowestVariant?.price ?? product.price;
            const isActive = index === selectedIndex;
            return (
              <article
                className="grid min-w-0 flex-[0_0_100%] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-stretch bg-featured-slide max-[700px]:grid-cols-1"
                key={product.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${products.length}: ${product.name}`}
                aria-hidden={!isActive}
                inert={!isActive}
              >
                <Link className="featured-carousel-image-motion relative block min-h-[490px] min-w-0 overflow-hidden bg-[#e4e9e3] max-[700px]:min-h-0 max-[700px]:aspect-[4/3]" href={`/products/${product.slug}`} tabIndex={isActive ? 0 : -1}>
                  {image ? <Image src={image.imageUrl} alt={image.alt || product.name} fill sizes="(max-width: 700px) 90vw, 48vw" priority={index === 0} /> : <span className="grid h-full place-items-center p-5 text-muted">{product.name}</span>}
                  {Number(product.discountPercentage) > 0 && <span className="absolute left-3 top-3 bg-[#fffdf5e8] px-2 py-1 text-[10px] text-[#a34132] backdrop-blur-[6px] max-[700px]:left-2 max-[700px]:top-2 max-[700px]:text-[9px]">-{product.discountPercentage}%</span>}
                  <span className="absolute right-5 bottom-5 grid h-[42px] w-[42px] place-items-center rounded-full border border-white/80 bg-white/75 text-[#20372a] backdrop-blur-[14px] max-[700px]:right-3 max-[700px]:bottom-3 max-[700px]:h-9 max-[700px]:w-9" aria-hidden="true">
                    <ArrowUpRight size={19} />
                  </span>
                </Link>
                <div className="flex min-w-0 flex-col items-start justify-center px-[clamp(24px,4vw,68px)] py-12 text-[#20372a] max-[700px]:px-5 max-[700px]:pt-6 max-[700px]:pb-[27px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[1.6px] text-green">{product.category.name}</span>
                  <h3 className="mt-[15px] max-w-[12ch] break-words font-editorial text-[40px] font-medium leading-[1.03] max-[700px]:mt-[9px] max-[700px]:max-w-none max-[700px]:text-[30px]">{product.name}</h3>
                  <p className="mt-[17px] line-clamp-5 max-w-[44ch] overflow-hidden text-[13px] leading-[1.7] text-[#536157] max-[700px]:mt-[10px] max-[700px]:line-clamp-4">{product.description}</p>
                  <p className="mt-[22px] flex flex-wrap items-baseline gap-[9px] text-lg font-[650] max-[700px]:mt-[14px] max-[700px]:text-base">
                    {product.hasPriceRange && <span className="text-muted">From </span>}
                    {money(product.fromPrice)}
                    {Number(product.discountPercentage) > 0 && !product.hasPriceRange && <del className="text-xs font-normal text-muted">{money(originalPrice)}</del>}
                  </p>
                  <span className="mt-[5px] text-[10px] text-muted">{product.variants.length} options</span>
                  <Link className="featured-carousel-details-motion mt-[25px] inline-flex items-center gap-[18px] border-b border-[#20372a]/65 py-[11px] text-xs font-semibold text-[#20372a] hover:gap-6 hover:text-green max-[700px]:mt-4" href={`/products/${product.slug}`}>
                    View details <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {products.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-[18px] max-[700px]:mt-3 max-[700px]:gap-2.5" aria-label="Featured product controls">
          <div className="flex items-center gap-2 max-[700px]:gap-1" aria-label="Choose a featured product">
            {products.map((product, index) => (
              <Button
                key={product.id}
                type="button"
                variant="ghost"
                size="icon"
                className="!h-8 !min-h-8 !w-[26px] !rounded-none !px-0 !py-0"
                title={`Go to ${product.name}`}
                aria-label={`Go to slide ${index + 1}: ${product.name}`}
                aria-current={index === selectedIndex ? "true" : undefined}
                onClick={() => {
                  emblaApi?.scrollTo(index);
                }}
              >
                <span className={`featured-carousel-dot-motion h-[7px] rounded-full ${index === selectedIndex ? "w-5 rounded-md bg-green" : "w-[7px] bg-[#a6b0a7]"}`} />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 max-[700px]:gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="!h-10 !min-h-10 !w-10 !rounded-full !bg-[rgba(255,255,255,0.72)] hover:!bg-white hover:!brightness-100 max-[700px]:!h-9 max-[700px]:!min-h-9 max-[700px]:!w-9"
              title="Previous featured product"
              aria-label="Previous featured product"
              onClick={() => {
                emblaApi?.scrollPrev();
              }}
            >
              <ArrowLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="!h-10 !min-h-10 !w-10 !rounded-full !bg-[rgba(255,255,255,0.72)] hover:!bg-white hover:!brightness-100 max-[700px]:!h-9 max-[700px]:!min-h-9 max-[700px]:!w-9"
              title="Next featured product"
              aria-label="Next featured product"
              onClick={() => {
                emblaApi?.scrollNext();
              }}
            >
              <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
