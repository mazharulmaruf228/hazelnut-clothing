"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import type { Product } from "@/schemas/api";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FeaturedCarousel({ products }: { products: Product[] }) {
  const [autoplay] = useState(() => Autoplay({ delay: 5000, playOnInit: false, stopOnInteraction: false, stopOnMouseEnter: false, stopOnFocusIn: false }));
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: products.length > 1, align: "start", duration: 70 }, [autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [pausedByInteraction, setPausedByInteraction] = useState(false);
  const [explicitlyStarted, setExplicitlyStarted] = useState(false);
  const shouldRotate = products.length > 1 && rotationEnabled && !pausedByInteraction && (!reducedMotion || explicitlyStarted);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setRotationEnabled(false);
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

  function pauseForInteraction() {
    setPausedByInteraction(true);
  }

  function startForInteraction() {
    setPausedByInteraction(false);
  }

  if (products.length === 0) {
    return (
      <section className="featured-carousel-empty catalogue-section" id="collection">
        <h2>The collection</h2>
        <p>No featured pieces at the moment.</p>
      </section>
    );
  }

  return (
    <section
      className="featured-carousel catalogue-section"
      id="collection"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onPointerEnter={pauseForInteraction}
      onPointerLeave={startForInteraction}
      onFocusCapture={pauseForInteraction}
      onPointerDown={pauseForInteraction}
    >
      <div className="featured-carousel-heading">
        <div>
          <span className="eyebrow">The featured edit</span>
          <h2>The collection</h2>
        </div>
        <span className="muted">{products.length} pieces</span>
      </div>
      <div className="featured-carousel-viewport" ref={viewportRef} aria-live={shouldRotate ? "off" : "polite"}>
        <div className="featured-carousel-track">
          {products.map((product, index) => {
            const image = product.images.find((item) => !item.variantId) ?? product.images[0];
            const lowestVariant = product.variants.find((variant) => variant.isActive && variant.effectivePrice === product.fromPrice);
            const originalPrice = lowestVariant?.price ?? product.price;
            const isActive = index === selectedIndex;
            return (
              <article className="featured-carousel-slide" key={product.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${products.length}: ${product.name}`} aria-hidden={!isActive} inert={!isActive}>
                <Link className="featured-carousel-image" href={`/products/${product.slug}`} tabIndex={isActive ? 0 : -1}>
                  {image ? <Image src={image.imageUrl} alt={image.alt || product.name} fill sizes="(max-width: 700px) 90vw, 48vw" priority={index === 0} /> : <span className="image-missing">{product.name}</span>}
                  {Number(product.discountPercentage) > 0 && <span className="product-badge">-{product.discountPercentage}%</span>}
                  <span className="featured-carousel-image-link" aria-hidden="true">
                    <ArrowUpRight size={19} />
                  </span>
                </Link>
                <div className="featured-carousel-copy">
                  <span className="eyebrow">{product.category.name}</span>
                  <h3>{product.name}</h3>
                  <p className="featured-carousel-description">{product.description}</p>
                  <p className="featured-carousel-price">
                    {product.hasPriceRange && <span className="muted">From </span>}
                    {money(product.fromPrice)}
                    {Number(product.discountPercentage) > 0 && !product.hasPriceRange && <del>{money(originalPrice)}</del>}
                  </p>
                  <span className="muted variant-note">{product.variants.length} options</span>
                  <Link className="featured-carousel-details" href={`/products/${product.slug}`}>
                    View details <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {products.length > 1 && (
        <div className="featured-carousel-controls" aria-label="Featured product controls">
          <div className="featured-carousel-pagination" aria-label="Choose a featured product">
            {products.map((product, index) => (
              <Button
                key={product.id}
                type="button"
                variant="ghost"
                size="icon"
                className={`featured-carousel-dot ${index === selectedIndex ? "active" : ""}`}
                title={`Go to ${product.name}`}
                aria-label={`Go to slide ${index + 1}: ${product.name}`}
                aria-current={index === selectedIndex ? "true" : undefined}
                onClick={() => {
                  pauseForInteraction();
                  emblaApi?.scrollTo(index);
                }}
              >
                <span />
              </Button>
            ))}
          </div>
          <div className="featured-carousel-actions">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="featured-carousel-nav"
              title="Previous featured product"
              aria-label="Previous featured product"
              onClick={() => {
                pauseForInteraction();
                emblaApi?.scrollPrev();
              }}
            >
              <ArrowLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="featured-carousel-nav"
              title="Next featured product"
              aria-label="Next featured product"
              onClick={() => {
                pauseForInteraction();
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
