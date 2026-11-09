"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCart, clearCart } from "@/lib/cart";
import { money } from "@/lib/utils";

export default function CheckoutPage() {
  const { lines } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const subtotal = lines.reduce((total, line) => total + Number(line.unitPrice) * line.quantity, 0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length || submitting) return;
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"),
          email: form.get("email"),
          phone: form.get("phone"),
          deliveryAddress: form.get("deliveryAddress"),
          deliveryArea: form.get("deliveryArea"),
          customerNote: form.get("customerNote"),
          items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message || "Unable to place this order. Check stock and try again.");
      }
      clearCart();
      router.push("/order-placed");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to place this order. Please try again.");
      setSubmitting(false);
    }
  }

  if (!lines.length) {
    return (
      <section className="store-flow">
        <div className="empty-state">
          <p>Your bag is empty.</p>
          <Button asChild>
            <Link href="/products">Explore the collection</Link>
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className="store-flow">
      <Link href="/cart" className="back-link">
        <ArrowLeft size={16} /> Back to your bag
      </Link>
      <div className="store-flow-heading">
        <span className="eyebrow">Guest checkout</span>
        <h1>Delivery details</h1>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <div className="form-grid">
            <Label>
              Name
              <Input name="customerName" autoComplete="name" required maxLength={120} />
            </Label>
            <Label>
              Email
              <Input name="email" type="email" autoComplete="email" required maxLength={254} />
            </Label>
            <Label>
              Phone
              <Input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} />
            </Label>
            <Label>
              Delivery area
              <Input name="deliveryArea" required maxLength={120} />
            </Label>
            <Label className="checkout-address">
              Delivery address
              <textarea name="deliveryAddress" autoComplete="street-address" required minLength={5} maxLength={500} />
            </Label>
            <Label className="checkout-address">
              Order note (optional)
              <textarea name="customerNote" maxLength={1000} />
            </Label>
          </div>
          {error && (
            <p role="alert" className="status-message">
              {error}
            </p>
          )}
          <Button disabled={submitting}>{submitting ? "Submitting order..." : "Place order for review"}</Button>
        </form>
        <aside className="cart-summary checkout-summary">
          <h2>Order summary</h2>
          {lines.map((line) => (
            <div className="checkout-summary-line" key={line.variantId}>
              <span>
                {line.productName} · {line.variantName} × {line.quantity}
              </span>
              <strong>{money((Number(line.unitPrice) * line.quantity).toFixed(2))}</strong>
            </div>
          ))}
          <div className="checkout-total">
            <span>Subtotal</span>
            <strong>{money(subtotal.toFixed(2))}</strong>
          </div>
          <p>Your order is unpaid and remains pending until reviewed. Stock is reserved when submitted.</p>
        </aside>
      </div>
    </section>
  );
}
