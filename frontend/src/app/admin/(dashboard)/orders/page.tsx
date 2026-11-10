"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useChangeMutation, useOrdersQuery, useProductsQuery } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Order } from "@/schemas/api";
import { errorMessage, money } from "@/lib/utils";
import { useDeliveryOptions } from "@/lib/delivery";

type OrderLineInput = { variantId: string; quantity: string };
type OrderContact = Pick<Order, "customerName" | "email" | "phone" | "deliveryAddress" | "deliveryArea" | "district" | "postcode" | "customerNote">;

function OrderEditor({ order, close }: { order: Order; close: () => void }) {
  const { data: productData, isLoading: productsLoading } = useProductsQuery("status=PUBLISHED&page=1&pageSize=100");
  const { items: deliveryOptions, isLoading: deliveryOptionsLoading, error: deliveryOptionsError } = useDeliveryOptions();
  const [change, { isLoading }] = useChangeMutation();
  const [error, setError] = useState("");
  const [contact, setContact] = useState<OrderContact>({
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    deliveryAddress: order.deliveryAddress,
    deliveryArea: order.deliveryArea,
    district: order.district,
    postcode: order.postcode,
    customerNote: order.customerNote,
  });
  const [items, setItems] = useState<OrderLineInput[]>(order.items.map((item) => ({ variantId: item.variantId ?? "", quantity: String(item.quantity) })));
  const variants = (productData?.items ?? []).flatMap((product) => product.variants.filter((variant) => variant.isActive).map((variant) => ({ product, variant })));
  const variantsById = new Map(variants.map((option) => [option.variant.id, option]));
  const unchanged = items.length === order.items.length && items.every((line) => order.items.some((item) => item.variantId === line.variantId && item.quantity === Number(line.quantity)));
  const subtotal = unchanged ? order.subtotal : items.reduce((total, line) => total + Number(variantsById.get(line.variantId)?.variant.effectivePrice ?? 0) * (Number(line.quantity) || 0), 0).toFixed(2);
  const districtChanged = contact.district !== order.district;
  const deliveryCharge = districtChanged ? (deliveryOptions.find((option) => option.district === contact.district)?.deliveryCharge ?? (contact.district ? order.deliveryCharge : "0.00")) : order.deliveryCharge;
  const total = (Number(subtotal) + Number(deliveryCharge)).toFixed(2);

  function setContactField<K extends keyof OrderContact>(field: K, value: OrderContact[K]) {
    setContact((current) => ({ ...current, [field]: value }));
  }
  function setLine(index: number, patch: Partial<OrderLineInput>) {
    setItems((current) => current.map((item, lineIndex) => (lineIndex === index ? { ...item, ...patch } : item)));
  }
  function maximumFor(variantId: string) {
    const option = variantsById.get(variantId)?.variant;
    const reservedByOrder = order.items.filter((item) => item.variantId === variantId).reduce((total, item) => total + item.quantity, 0);
    return Math.min(20, (option?.availableQuantity ?? 0) + reservedByOrder);
  }
  function addLine() {
    const next = variants.find(({ variant }) => variant.availableQuantity > 0 && !items.some((item) => item.variantId === variant.id));
    setItems((current) => [...current, { variantId: next?.variant.id ?? "", quantity: "1" }]);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!items.length || items.some((item) => !item.variantId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 20)) {
      setError("Choose a variant and a quantity from 1 to 20 for each item.");
      return;
    }
    try {
      await change({
        url: `/admin/orders/${order.id}`,
        method: "PATCH",
        body: { ...contact, updatedAt: order.updatedAt, items: items.map((item) => ({ variantId: item.variantId, quantity: Number(item.quantity) })) },
      }).unwrap();
      close();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="!max-h-[min(88vh,900px)] !w-[min(860px,calc(100vw-32px))] overflow-y-auto">
        <DialogTitle>Edit order {order.id.slice(0, 8).toUpperCase()}</DialogTitle>
        <DialogDescription>Changes stay pending for customer agreement. Item changes use current catalogue prices and update reserved stock.</DialogDescription>
        <form className="mt-5 grid gap-5" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <Label>
              Customer name
              <Input value={contact.customerName} onChange={(event) => setContactField("customerName", event.target.value)} required maxLength={120} />
            </Label>
            <Label>
              Email
              <Input type="email" value={contact.email} onChange={(event) => setContactField("email", event.target.value)} required maxLength={254} />
            </Label>
            <Label>
              Phone
              <Input type="tel" value={contact.phone} onChange={(event) => setContactField("phone", event.target.value)} required minLength={7} maxLength={30} />
            </Label>
            <Label>
              District
              <select className="min-h-[42px] w-full rounded-[4px] border border-line bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-foreground" aria-label="Delivery district" value={contact.district ?? ""} onChange={(event) => setContactField("district", event.target.value || null)}>
                <option value="">Legacy address / no district</option>
                {deliveryOptions.map((option) => (
                  <option key={option.district} value={option.district}>
                    {option.district}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Postcode
              <Input inputMode="numeric" pattern="[0-9]{4}" value={contact.postcode ?? ""} onChange={(event) => setContactField("postcode", event.target.value || null)} maxLength={4} />
            </Label>
            <Label className="col-span-full max-[600px]:col-auto">
              Legacy delivery area
              <Input value={contact.deliveryArea} onChange={(event) => setContactField("deliveryArea", event.target.value)} maxLength={120} />
            </Label>
            <Label className="col-span-full max-[600px]:col-auto">
              House / road
              <Textarea value={contact.deliveryAddress} onChange={(event) => setContactField("deliveryAddress", event.target.value)} required minLength={5} maxLength={500} />
            </Label>
            <Label className="col-span-full max-[600px]:col-auto">
              Order note
              <Textarea value={contact.customerNote} onChange={(event) => setContactField("customerNote", event.target.value)} maxLength={1000} />
            </Label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px]">Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus size={14} /> Add item
            </Button>
          </div>
          <div className="grid gap-3">
            {items.map((item, index) => {
              const original = order.items.find((line) => line.variantId === item.variantId);
              const existingVariantUnavailable = item.variantId && !variantsById.has(item.variantId);
              return (
                <div className="grid grid-cols-[minmax(0,1fr)_110px_36px] items-end gap-3 border-b border-line pb-3 max-[600px]:grid-cols-[minmax(0,1fr)_76px_34px] max-[600px]:gap-[7px]" key={`${order.id}-${index}`}>
                  <Label>
                    Variant
                    <select
                      className="min-h-[42px] w-full min-w-0 rounded-[4px] border border-line bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-foreground max-[600px]:p-2 max-[600px]:text-[11px]"
                      aria-label={`Variant for item ${index + 1}`}
                      value={item.variantId}
                      onChange={(event) => setLine(index, { variantId: event.target.value })}
                    >
                      <option value="">Choose a variant</option>
                      {existingVariantUnavailable && original && (
                        <option value={item.variantId}>
                          {original.productName} · {original.variantName} (unavailable)
                        </option>
                      )}
                      {variants.map(({ product, variant }) => {
                        const max = maximumFor(variant.id);
                        const duplicate = items.some((other, otherIndex) => otherIndex !== index && other.variantId === variant.id);
                        return (
                          <option key={variant.id} value={variant.id} disabled={duplicate || max < 1}>
                            {product.name} · {variant.name} ({variant.availableQuantity} available)
                          </option>
                        );
                      })}
                    </select>
                  </Label>
                  <Label>
                    Quantity
                    <Input aria-label={`Quantity for item ${index + 1}`} type="number" min="1" max={item.variantId ? maximumFor(item.variantId) : 20} step="1" value={item.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} required />
                  </Label>
                  <Button className="!h-[42px] !w-9 !min-h-[42px]" type="button" variant="ghost" size="icon" title="Remove item" aria-label={`Remove item ${index + 1}`} onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              );
            })}
          </div>
          {productsLoading && (
            <p role="status" className="text-muted">
              Loading available variants...
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-foreground pt-[15px] text-[13px]">
            <span>{unchanged ? "Item subtotal" : "Recalculated item subtotal"}</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span>Delivery charge</span>
            <strong>{money(deliveryCharge)}</strong>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-foreground pt-[15px] text-[13px]">
            <span>Grand total</span>
            <strong>{money(total)}</strong>
          </div>
          {deliveryOptionsError && (
            <p role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
              {deliveryOptionsError}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
              {error}
            </p>
          )}
          <div className="mt-[22px] flex flex-wrap items-center gap-3 text-[11px]">
            <Button disabled={isLoading || !items.length || (productsLoading && !unchanged) || (districtChanged && (deliveryOptionsLoading || Boolean(deliveryOptionsError)))}>Save order</Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const { data, isFetching, error, refetch } = useOrdersQuery();
  const [change, { isLoading }] = useChangeMutation();
  const [actionError, setActionError] = useState("");
  const [editingOrder, setEditingOrder] = useState<Order>();
  async function review(id: string, status: "CONFIRMED" | "REJECTED") {
    setActionError("");
    try {
      await change({ url: `/admin/orders/${id}/status`, method: "PATCH", body: { status } }).unwrap();
    } catch (reviewError) {
      setActionError(errorMessage(reviewError));
    }
  }
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-5 max-[700px]:mb-6 max-[700px]:items-start max-[700px]:gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[1.6px] text-muted">Commerce</span>
          <h1 className="mt-2 overflow-wrap-anywhere font-sans text-[28px] font-medium leading-[1.2] max-[700px]:text-[25px]">Orders</h1>
        </div>
      </div>
      {(error || actionError) && (
        <div role="alert" className="rounded-[4px] border border-[#e4bfb4] bg-[#fff1ec] p-3 text-xs text-[#873723]">
          {actionError || "Unable to load orders."}{" "}
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}
      <TableContainer aria-busy={isFetching}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Item subtotal</TableHead>
              <TableHead>Delivery charge</TableHead>
              <TableHead>Grand total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="min-w-[180px]">
                  <strong>{order.id.slice(0, 8).toUpperCase()}</strong>
                  <small className="mt-1 block text-[10px] text-muted">{new Date(order.createdAt).toLocaleString()}</small>
                </TableCell>
                <TableCell className="min-w-[180px]">
                  {order.customerName}
                  <small className="mt-1 block text-[10px] text-muted">
                    <a href={`mailto:${order.email}`}>{order.email}</a>
                    <br />
                    {order.phone}
                  </small>
                </TableCell>
                <TableCell className="min-w-[180px]">
                  {order.district ?? (order.deliveryArea || "District not set")}
                  {order.postcode && <small className="mt-1 block text-[10px] text-muted">Postcode: {order.postcode}</small>}
                  <small className="mt-1 block text-[10px] text-muted">{order.deliveryAddress}</small>
                  {order.district && order.deliveryArea && <small className="mt-1 block text-[10px] text-muted">Legacy area: {order.deliveryArea}</small>}
                  {order.customerNote && <small className="mt-1 block text-[10px] text-muted">Note: {order.customerNote}</small>}
                </TableCell>
                <TableCell className="min-w-[180px]">
                  {order.items.map((item) => (
                    <small className="mt-1 block text-[10px] text-muted" key={item.id}>
                      {item.quantity} × {item.productName} · {item.variantName} ({item.sku})
                    </small>
                  ))}
                </TableCell>
                <TableCell>{money(order.subtotal)}</TableCell>
                <TableCell>{money(order.deliveryCharge)}</TableCell>
                <TableCell>{money(order.total)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-[3px] bg-[#fff0d6] px-[7px] py-1 text-[9px] font-semibold text-[#805d1b] ${order.status === "CONFIRMED" ? "bg-[#e0ede1] text-[#2d5a39]" : order.status === "REJECTED" ? "bg-[#ece8e5] text-[#6b5c53]" : ""}`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  {order.status === "PENDING_REVIEW" ? (
                    <div className="flex items-center gap-[3px] whitespace-nowrap">
                      <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Edit order" aria-label={`Edit order for ${order.customerName}`} onClick={() => setEditingOrder(order)}>
                        <Pencil size={15} />
                      </Button>
                      <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Confirm order and consume reserved stock" aria-label="Confirm order" disabled={isLoading} onClick={() => void review(order.id, "CONFIRMED")}>
                        <Check size={16} />
                      </Button>
                      <Confirm
                        title="Reject order?"
                        description="Rejecting this order releases its reserved stock."
                        onConfirm={() => review(order.id, "REJECTED")}
                        trigger={
                          <Button className="!h-8 !min-h-8 !w-8" variant="ghost" size="icon" title="Reject order" aria-label="Reject order" disabled={isLoading}>
                            <X size={16} />
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!data?.items.length && !isFetching && <div className="px-5 py-20 text-center">No orders yet.</div>}
      {editingOrder && <OrderEditor key={editingOrder.id} order={editingOrder} close={() => setEditingOrder(undefined)} />}
    </>
  );
}
