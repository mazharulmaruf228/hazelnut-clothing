"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Expand, X, Check } from "lucide-react";
import type { Product, ProductImage } from "@/schemas/api";
import { money } from "@/lib/utils";
import { ColorSwatch } from "./color-swatch";

function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const image = images[index] ?? images[0];
  if (!image) return <div className="gallery-placeholder">{name}</div>;
  return (
    <div className="gallery">
      <Dialog.Root>
        <Dialog.Trigger className="gallery-main" title="Enlarge product image">
          <Image src={image.imageUrl} alt={image.alt || name} fill sizes="(max-width: 760px) 100vw, 55vw" loading="eager" fetchPriority="high" />
          <span className="zoom-hint">
            <Expand size={18} />
          </span>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="image-dialog">
            <Dialog.Title className="sr-only">{name}</Dialog.Title>
            <Dialog.Description className="sr-only">Enlarged product photograph</Dialog.Description>
            <Image src={image.imageUrl} alt={image.alt || name} fill sizes="90vw" style={{ objectFit: "contain" }} />
            <Dialog.Close className="dialog-close" aria-label="Close image">
              <X size={22} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="gallery-thumbnails">
        {images.map((item, position) => (
          <button key={item.id} onClick={() => setIndex(position)} aria-label={`View image ${position + 1}`} aria-pressed={index === position}>
            <Image src={item.imageUrl} alt={item.alt || name} fill sizes="76px" />
          </button>
        ))}
      </div>
    </div>
  );
}
export function ProductDetail({ product, initialVariant }: { product: Product; initialVariant?: string }) {
  const active = product.variants.filter((variant) => variant.isActive);
  const [selectedId, setSelectedId] = useState(active.find((variant) => variant.id === initialVariant)?.id || active.find((variant) => variant.isDefault)?.id || active[0]?.id);
  const selected = active.find((variant) => variant.id === selectedId) ?? active[0];
  if (!selected) return <p className="empty-state">No variants are currently available.</p>;
  const attributeNames = [...new Set(active.flatMap((variant) => Object.keys(variant.attributes)))];
  const variantImages = product.images.filter((image) => image.variantId === selected.id);
  const images = variantImages.length ? variantImages : product.images.filter((image) => !image.variantId);
  function choose(key: string, value: string) {
    const matching = active.filter((variant) => variant.attributes[key] === value);
    const next = matching.find((variant) => attributeNames.every((name) => name === key || variant.attributes[name] === selected.attributes[name])) ?? matching[0];
    if (!next) return;
    setSelectedId(next.id);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.id);
    window.history.replaceState(null, "", url);
  }
  return (
    <>
      <Link href="/products" className="back-link">
        <ArrowLeft size={16} /> Back to the collection
      </Link>
      <div className="product-detail">
        <Gallery key={selected.id} images={images.length ? images : product.images} name={product.name} />
        <div className="product-information">
          <Link className="eyebrow" href={`/categories/${product.category.slug}`}>
            {product.category.name}
          </Link>
          <h1>{product.name}</h1>
          <div className="detail-price">
            {money(selected.effectivePrice)}
            {Number(product.discountPercentage) > 0 && (
              <>
                <del>{money(selected.price ?? product.price)}</del>
                <span className="discount-label">-{product.discountPercentage}%</span>
              </>
            )}
          </div>
          <p className="product-description">{product.description}</p>
          <div className="variant-selectors">
            {attributeNames.map((key) => (
              <fieldset key={key}>
                <legend>
                  {key}
                  <span>{selected.attributes[key]}</span>
                </legend>
                <div className="variant-options">
                  {[...new Set(active.map((variant) => variant.attributes[key]).filter(Boolean))].map((value) => (
                    <button key={value} type="button" className={selected.attributes[key] === value ? "selected" : ""} aria-pressed={selected.attributes[key] === value} onClick={() => choose(key, value)}>
                      {key.toLowerCase() === "color" && <ColorSwatch value={value} />}
                      {value}
                      {selected.attributes[key] === value && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="product-meta">
            <span>Selected option</span>
            <strong>{selected.name}</strong>
            <span>SKU</span>
            <code>{selected.sku}</code>
            <span>Currency</span>
            <span>Bangladeshi Taka (BDT)</span>
          </div>
        </div>
      </div>
    </>
  );
}
