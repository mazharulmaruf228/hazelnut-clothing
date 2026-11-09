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
    <section className="store-flow">
      <div className="store-flow-heading">
        <span className="eyebrow">Your selection</span>
        <h1>Shopping bag</h1>
      </div>
      {lines.length === 0 ? (
        <div className="empty-state">
          <p>Your bag is empty.</p>
          <Button asChild>
            <Link href="/products">Explore the collection</Link>
          </Button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {lines.map((line) => (
              <article className="cart-line" key={line.variantId}>
                <Link href={`/products/${line.slug}`} className="cart-image">
                  {line.imageUrl ? <Image src={line.imageUrl} alt={line.productName} fill sizes="110px" /> : <span>{line.productName}</span>}
                </Link>
                <div className="cart-line-info">
                  <Link href={`/products/${line.slug}`}>
                    <strong>{line.productName}</strong>
                  </Link>
                  <span>
                    {line.variantName} · {line.sku}
                  </span>
                  {line.availableQuantity !== undefined && <span>{line.availableQuantity} available</span>}
                  <span>{money(line.unitPrice)}</span>
                </div>
                <div className="cart-line-actions">
                  <div className="quantity-control" aria-label={`Quantity for ${line.productName}`}>
                    <Button variant="ghost" size="icon" title="Decrease quantity" aria-label="Decrease quantity" disabled={line.quantity <= 1} onClick={() => setCartQuantity(line.variantId, line.quantity - 1)}>
                      <Minus size={14} />
                    </Button>
                    <span>{line.quantity}</span>
                    <Button variant="ghost" size="icon" title="Increase quantity" aria-label="Increase quantity" disabled={line.quantity >= Math.min(20, line.availableQuantity ?? 20)} onClick={() => setCartQuantity(line.variantId, line.quantity + 1)}>
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
          <aside className="cart-summary">
            <div>
              <span>Subtotal</span>
              <strong>{money(subtotal.toFixed(2))}</strong>
            </div>
            <p>Delivery details and final availability are confirmed with your order.</p>
            <Button asChild>
              <Link href="/checkout">Continue to checkout</Link>
            </Button>
          </aside>
        </div>
      )}
    </section>
  );
}
