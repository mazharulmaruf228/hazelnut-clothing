"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orderSchema, type Order } from "@/schemas/api";
import { errorMessage, money } from "@/lib/utils";

export default function OrderHistoryPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [contactType, setContactType] = useState<"email" | "phone">("email");
  const [contact, setContact] = useState("");
  const [order, setOrder] = useState<Order>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setOrder(undefined);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          [contactType]: contact.trim(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage({ data: body }));
      const parsed = orderSchema.safeParse(body);
      if (!parsed.success) throw new Error("The order lookup returned invalid details.");
      setOrder(parsed.data);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable to look up this order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[900px] px-[5%] pt-14 pb-[100px] max-[700px]:pt-[38px] max-[700px]:pb-[72px]">
      <div className="mb-9">
        <span className="text-[10px] font-semibold uppercase tracking-[1.6px]">Guest order lookup</span>
        <h1 className="mt-2">Find an order</h1>
        <p className="mt-3 max-w-[560px] text-sm text-muted">Enter the order number and the email address or phone number used at checkout. This lookup returns one order at a time.</p>
      </div>
      <form className="grid max-w-[560px] gap-5" onSubmit={lookup}>
        <Label>
          Order number
          <Input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required maxLength={36} autoComplete="off" />
        </Label>
        <Label>
          Match using
          <select className="min-h-[42px] w-full rounded-[4px] border border-line bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-foreground" value={contactType} onChange={(event) => setContactType(event.target.value === "phone" ? "phone" : "email")}>
            <option value="email">Email address</option>
            <option value="phone">Phone number</option>
          </select>
        </Label>
        <Label>
          {contactType === "email" ? "Email address" : "Phone number"}
          <Input type={contactType === "email" ? "email" : "tel"} value={contact} onChange={(event) => setContact(event.target.value)} required maxLength={254} autoComplete={contactType === "email" ? "email" : "tel"} />
        </Label>
        {error && <p role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">{error}</p>}
        <Button disabled={submitting}>{submitting ? "Looking up order..." : "Find order"}</Button>
      </form>
      {order && (
        <section className="mt-12 grid gap-5 border-t border-foreground pt-5" aria-label="Order details">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-sans text-lg">Order {order.id}</h2>
              <p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleString()} · {order.status.replaceAll("_", " ")}</p>
            </div>
            <span className="text-xs">Delivery to: {order.district ?? (order.deliveryArea || "District not set")}{order.postcode ? ` · ${order.postcode}` : ""}</span>
          </div>
          <p className="text-sm text-muted">{order.deliveryAddress}</p>
          <div className="grid gap-3">
            {order.items.map((item) => (
              <div className="flex justify-between gap-4 text-sm" key={item.id}>
                <span>{item.quantity} × {item.productName} · {item.variantName}</span>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="ml-auto grid w-full max-w-[320px] gap-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4"><span>Item subtotal</span><strong>{money(order.subtotal)}</strong></div>
            <div className="flex justify-between gap-4"><span>Delivery charge</span><strong>{money(order.deliveryCharge)}</strong></div>
            <div className="flex justify-between gap-4 border-t border-line pt-3"><span>Grand total</span><strong>{money(order.total)}</strong></div>
          </div>
        </section>
      )}
    </section>
  );
}
