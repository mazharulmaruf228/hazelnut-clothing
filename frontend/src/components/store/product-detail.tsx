"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Expand, X, Check, ShoppingBag } from "lucide-react";
import type { Product, ProductImage } from "@/schemas/api";
import { addCartLine } from "@/lib/cart";
import { money } from "@/lib/utils";
import { ColorSwatch } from "./color-swatch";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const image = images[index] ?? images[0];
  if (!image) return <div className="grid aspect-[4/4.7] place-items-center rounded-[4px] bg-[#e8eae6] p-5 text-muted max-[700px]:aspect-[4/4.5]">{name}</div>;
  return (
    <div className="min-w-0">
      <Dialog>
        <DialogTrigger className="relative block aspect-[4/4.7] w-full overflow-hidden rounded-[4px] border-0 bg-[#e8eae6] max-[700px]:aspect-[4/4.5]" title="Enlarge product image" aria-label="Enlarge product image">
          <Image src={image.imageUrl} alt={image.alt || name} fill sizes="(max-width: 760px) 100vw, 55vw" loading="eager" fetchPriority="high" />
          <span className="absolute right-[18px] bottom-[18px] grid rounded-full bg-[#ffffffdf] p-[9px]">
            <Expand size={18} />
          </span>
        </DialogTrigger>
        <DialogContent className="image-dialog-motion !inset-[5vh_5vw] !h-[90vh] !max-h-[90vh] !w-auto !max-w-none !translate-x-0 !translate-y-0 !transform-none !overflow-hidden !rounded-md !border-0 !bg-[#f5f5f0] !p-0 !shadow-none !backdrop-blur-0 !backdrop-saturate-100" showCloseButton={false}>
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <DialogDescription className="sr-only">Enlarged product photograph</DialogDescription>
          <Image className="object-contain" src={image.imageUrl} alt={image.alt || name} fill sizes="90vw" />
          <DialogClose className="absolute right-3 top-3 z-[1] grid h-[38px] w-[38px] place-items-center rounded-full border border-line bg-white" aria-label="Close image">
            <X size={22} />
          </DialogClose>
        </DialogContent>
      </Dialog>
      <div className="mt-3 flex gap-2.5 overflow-auto">
        {images.map((item, position) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            className="!relative !h-20 !min-h-0 !w-[68px] !min-w-[68px] !overflow-hidden !rounded-[3px] !border !border-line !p-0 aria-pressed:!border-2 aria-pressed:!border-green"
            onClick={() => setIndex(position)}
            aria-label={`View image ${position + 1}`}
            aria-pressed={index === position}
          >
            <Image src={item.imageUrl} alt={item.alt || name} fill sizes="76px" />
          </Button>
        ))}
      </div>
    </div>
  );
}
export function ProductDetail({ product, initialVariant }: { product: Product; initialVariant?: string }) {
  const active = product.variants.filter((variant) => variant.isActive);
  const [selectedId, setSelectedId] = useState(active.find((variant) => variant.id === initialVariant)?.id || active.find((variant) => variant.isDefault)?.id || active[0]?.id);
  const selected = active.find((variant) => variant.id === selectedId) ?? active[0];
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  if (!selected) return <p className="min-h-[250px] px-5 py-20 text-center">No variants are currently available.</p>;
  const maximumQuantity = Math.min(20, selected.availableQuantity);
  const visibleQuantity = Math.min(quantity, maximumQuantity);
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
      <Link href="/products" className="mb-[22px] inline-flex items-center gap-2 text-xs">
        <ArrowLeft size={16} /> Back to the collection
      </Link>
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-[65px] max-[1000px]:gap-[30px] max-[700px]:grid-cols-1 max-[700px]:gap-[25px]">
        <Gallery key={selected.id} images={images.length ? images : product.images} name={product.name} />
        <div className="min-w-0 pt-3 max-[700px]:pt-0">
          <Link className="text-[10px] font-semibold uppercase tracking-[1.6px]" href={`/categories/${product.category.slug}`}>
            {product.category.name}
          </Link>
          <h1 className="my-4 mb-[22px] overflow-wrap-anywhere text-[44px] max-[1000px]:text-4xl max-[700px]:text-[38px]">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-[13px] text-[21px]">
            {money(selected.effectivePrice)}
            {Number(product.discountPercentage) > 0 && (
              <>
                <del className="text-[15px] text-muted">{money(selected.price ?? product.price)}</del>
                <span className="bg-[#fae9e2] px-[7px] py-[3px] text-[11px] text-[#933a2b]">-{product.discountPercentage}%</span>
              </>
            )}
          </div>
          <p className="my-[26px] whitespace-pre-line text-sm text-muted">{product.description}</p>
          <div className="grid gap-6 border-t border-line pt-6">
            {attributeNames.map((key) => (
              <fieldset className="min-w-0" key={key}>
                <legend className="mb-3 text-xs font-semibold capitalize">
                  {key}
                  <span className="ml-4 font-normal text-muted">{selected.attributes[key]}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(active.map((variant) => variant.attributes[key]).filter(Boolean))].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      className={`!flex !min-h-10 !min-w-[46px] !items-center !justify-center !gap-[7px] !rounded-[3px] !border !border-line !bg-transparent !px-3 !py-2 !text-xs ${selected.attributes[key] === value ? "!border-green !bg-[#e8eee8] !text-green" : ""}`}
                      aria-pressed={selected.attributes[key] === value}
                      onClick={() => choose(key, value)}
                    >
                      {key.toLowerCase() === "color" && <ColorSwatch value={value} />}
                      {value}
                      {selected.attributes[key] === value && <Check size={13} />}
                    </Button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-[26px] mb-2 flex items-end gap-3">
            <label className="grid w-[100px] gap-[6px] text-[13px] font-medium">
              Quantity
              <Input aria-label="Quantity" type="number" min={maximumQuantity ? 1 : 0} max={maximumQuantity} step="1" value={visibleQuantity} disabled={!maximumQuantity} onChange={(event) => setQuantity(Math.max(1, Math.min(maximumQuantity, Math.floor(Number(event.target.value) || 1))))} />
            </label>

            <Button
              disabled={!maximumQuantity}
              onClick={() => {
                addCartLine({
                  variantId: selected.id,
                  productId: product.id,
                  slug: product.slug,
                  productName: product.name,
                  variantName: selected.name,
                  sku: selected.sku,
                  unitPrice: selected.effectivePrice,
                  imageUrl: images[0]?.imageUrl || product.images[0]?.imageUrl || "",
                  availableQuantity: maximumQuantity,
                  quantity: visibleQuantity,
                });
                setCartMessage(`${selected.name} added to cart`);
              }}
            >
              <ShoppingBag size={16} /> {maximumQuantity ? "Add to cart" : "Out of stock"}
            </Button>
          </div>
          <div className="text-xs">{maximumQuantity} in stock</div>

          {cartMessage && (
            <p className="mb-4 text-[11px] text-green" role="status">
              {cartMessage}
            </p>
          )}
          <div className="mt-[30px] grid grid-cols-[auto_minmax(0,1fr)] gap-x-[25px] gap-y-3 border-t border-line pt-[22px] text-[11px] max-[700px]:mt-6">
            <span>Selected option</span>
            <strong>{selected.name}</strong>
            <span>SKU</span>
            <code className="overflow-wrap-anywhere text-[10px]">{selected.sku}</code>
          </div>
        </div>
      </div>
    </>
  );
}
