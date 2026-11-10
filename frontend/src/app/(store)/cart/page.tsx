"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { removeCartLine, setCartQuantity, useCart } from "@/lib/cart";

export default function CartPage() {
  const { lines } = useCart();
  const subtotal = lines.reduce((total, line) => total + Number(line.unitPrice) * line.quantity, 0);
  return (
    <section className="mx-auto w-full max-w-[1180px] px-[5%] pt-14 pb-[100px] max-[700px]:pt-[38px] max-[700px]:pb-[72px]">
      <div className="mb-9 max-[700px]:mb-[25px]">
        <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">Your selection</span>
        <h1 className="mt-2">Shopping bag</h1>
      </div>
      {lines.length === 0 ? (
        <div className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
          <p>Your bag is empty.</p>
          <Button asChild>
            <Link href="/products">Explore the collection</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-12 max-[760px]:grid-cols-1 max-[760px]:gap-[30px]">
          <div className="border-t border-line">
            {lines.map((line) => (
              <article className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-[18px] border-b border-line py-4 max-[760px]:grid-cols-[68px_minmax(0,1fr)] max-[760px]:gap-3" key={line.variantId}>
                <Link href={`/products/${line.slug}`} className="relative grid aspect-[4/5] w-[88px] place-items-center overflow-hidden bg-[#e8eae6] text-center text-[10px] max-[760px]:row-span-2 max-[760px]:w-[68px]">
                  {line.imageUrl ? <Image src={line.imageUrl} alt={line.productName} fill sizes="110px" /> : <span>{line.productName}</span>}
                </Link>
                <div className="grid min-w-0 gap-[5px] text-xs">
                  <Link href={`/products/${line.slug}`}>
                    <strong>{line.productName}</strong>
                  </Link>
                  <span className="text-[10px] text-muted">
                    {line.variantName} · {line.sku}
                  </span>
                  {line.availableQuantity !== undefined && <span>{line.availableQuantity} available</span>}
                  <span>{money(line.unitPrice)}</span>
                </div>
                <div className="flex items-center gap-[5px] max-[760px]:col-start-2 max-[760px]:justify-between">
                  <div className="flex items-center gap-[5px] rounded-[4px] border border-line" aria-label={`Quantity for ${line.productName}`}>
                    <Button className="!h-[30px] !min-h-[30px] !w-[30px]" variant="ghost" size="icon" title="Decrease quantity" aria-label="Decrease quantity" disabled={line.quantity <= 1} onClick={() => setCartQuantity(line.variantId, line.quantity - 1)}>
                      <Minus size={14} />
                    </Button>
                    <span className="min-w-5 text-center text-[11px]">{line.quantity}</span>
                    <Button className="!h-[30px] !min-h-[30px] !w-[30px]" variant="ghost" size="icon" title="Increase quantity" aria-label="Increase quantity" disabled={line.quantity >= Math.min(20, line.availableQuantity ?? 20)} onClick={() => setCartQuantity(line.variantId, line.quantity + 1)}>
                      <Plus size={14} />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" title="Remove item" aria-label={`Remove ${line.productName}`} onClick={() => removeCartLine(line.variantId)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <aside className="grid gap-[18px] border-t border-foreground pt-[14px]">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <strong>{money(subtotal.toFixed(2))}</strong>
            </div>
            <p className="text-[11px] text-muted">Delivery details and final availability are confirmed with your order.</p>
            <Button className="w-full" asChild>
              <Link href="/checkout">Continue to checkout</Link>
            </Button>
          </aside>
        </div>
      )}
    </section>
  );
}
