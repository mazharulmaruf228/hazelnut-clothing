"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart, clearCart } from "@/lib/cart";
import { money } from "@/lib/utils";
import { useDeliveryOptions } from "@/lib/delivery";
import { orderReceiptSchema } from "@/schemas/api";

export default function CheckoutPage() {
  const { lines } = useCart();
  const router = useRouter();
  const { items: deliveryOptions, isLoading: deliveryOptionsLoading, error: deliveryOptionsError } = useDeliveryOptions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [district, setDistrict] = useState("");
  const subtotal = lines.reduce((total, line) => total + Number(line.unitPrice) * line.quantity, 0);
  const deliveryCharge = deliveryOptions.find((option) => option.district === district)?.deliveryCharge ?? "0.00";
  const total = (subtotal + Number(deliveryCharge)).toFixed(2);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length || submitting || deliveryOptionsLoading || deliveryOptionsError) return;
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
          district: form.get("district"),
          postcode: form.get("postcode"),
          customerNote: form.get("customerNote"),
          items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "object" && body.error !== null && "message" in body.error && typeof body.error.message === "string" ? body.error.message : "Unable to place this order. Check stock and try again.";
        throw new Error(message);
      }
      const parsed = orderReceiptSchema.safeParse(body);
      if (!parsed.success) {
        clearCart();
        router.push("/order-placed?receipt=unavailable");
        return;
      }
      let receiptSaved = true;
      try {
        sessionStorage.setItem("latest-order-receipt", JSON.stringify(parsed.data));
      } catch {
        receiptSaved = false;
      }
      clearCart();
      router.push(`/order-placed?order=${encodeURIComponent(parsed.data.id)}${receiptSaved ? "" : "&receipt=unavailable"}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to place this order. Please try again.");
      setSubmitting(false);
    }
  }

  if (!lines.length) {
    return (
      <section className="mx-auto w-full max-w-[1180px] px-[5%] pt-14 pb-[100px]">
        <div className="grid min-h-[250px] place-items-center px-5 py-20 text-center">
          <p>Your bag is empty.</p>
          <Button asChild>
            <Link href="/products">Explore the collection</Link>
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto w-full max-w-[1180px] px-[5%] pt-14 pb-[100px] max-[700px]:pt-[38px] max-[700px]:pb-[72px]">
      <Link href="/cart" className="mb-[22px] inline-flex items-center gap-2 text-xs">
        <ArrowLeft size={16} /> Back to your bag
      </Link>
      <div className="mb-9 max-[700px]:mb-[25px]">
        <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">Guest checkout</span>
        <h1 className="mt-2">Delivery details</h1>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-12 max-[760px]:grid-cols-1 max-[760px]:gap-[30px]">
        <form className="grid content-start gap-[22px]" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-[700px]:gap-4">
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
            <Label className="max-[700px]:col-auto">
              District
              <select
                className="min-h-[42px] w-full rounded-[4px] border border-line bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-foreground"
                name="district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                required
                disabled={deliveryOptionsLoading || Boolean(deliveryOptionsError)}
              >
                <option value="">Select a district</option>
                {deliveryOptions.map((option) => (
                  <option key={option.district} value={option.district}>
                    {option.district}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Postcode
              <Input name="postcode" inputMode="numeric" pattern="[0-9]{4}" required maxLength={4} autoComplete="postal-code" />
            </Label>
            <Label className="col-span-full max-[700px]:col-auto">
              House / road
              <Textarea name="deliveryAddress" autoComplete="street-address" required minLength={5} maxLength={500} />
            </Label>
            <Label className="col-span-full max-[700px]:col-auto">
              Order note (optional)
              <Textarea name="customerNote" maxLength={1000} />
            </Label>
          </div>
          {error && (
            <p role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
              {error}
            </p>
          )}
          {deliveryOptionsError && (
            <p role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
              {deliveryOptionsError}
            </p>
          )}
          <Button disabled={submitting || deliveryOptionsLoading || Boolean(deliveryOptionsError)}>{submitting ? "Submitting order..." : "Place order for review"}</Button>
        </form>
        <aside className="grid gap-[14px] border-t border-foreground pt-[14px]">
          <h2 className="font-sans text-base font-semibold leading-normal">Order summary</h2>
          {lines.map((line) => (
            <div className="flex justify-between gap-3 text-[11px]" key={line.variantId}>
              <span className="min-w-0">
                {line.productName} · {line.variantName} × {line.quantity}
              </span>
              <strong>{money((Number(line.unitPrice) * line.quantity).toFixed(2))}</strong>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-[14px]">
            <span>Item subtotal</span>
            <strong>{money(subtotal.toFixed(2))}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Delivery charge</span>
            <strong>{district ? money(deliveryCharge) : "Select a district"}</strong>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-[14px]">
            <span>Grand total</span>
            <strong>{district ? money(total) : "Select a district"}</strong>
          </div>
          <p className="text-[11px] text-muted">Your order is unpaid and remains pending until reviewed. Stock is reserved when submitted.</p>
        </aside>
      </div>
    </section>
  );
}
