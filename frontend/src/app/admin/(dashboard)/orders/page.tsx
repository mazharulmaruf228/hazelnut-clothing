"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useChangeMutation, useOrdersQuery, useProductsQuery } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Order } from "@/schemas/api";
import { errorMessage, money } from "@/lib/utils";

type OrderLineInput = { variantId: string; quantity: string };
type OrderContact = Pick<Order, "customerName" | "email" | "phone" | "deliveryAddress" | "deliveryArea" | "customerNote">;

function OrderEditor({ order, close }: { order: Order; close: () => void }) {
  const { data: productData, isLoading: productsLoading } = useProductsQuery("status=PUBLISHED&page=1&pageSize=100");
  const [change, { isLoading }] = useChangeMutation();
  const [error, setError] = useState("");
  const [contact, setContact] = useState<OrderContact>({
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    deliveryAddress: order.deliveryAddress,
    deliveryArea: order.deliveryArea,
    customerNote: order.customerNote,
  });
  const [items, setItems] = useState<OrderLineInput[]>(order.items.map((item) => ({ variantId: item.variantId ?? "", quantity: String(item.quantity) })));
  const variants = (productData?.items ?? []).flatMap((product) => product.variants.filter((variant) => variant.isActive).map((variant) => ({ product, variant })));
  const variantsById = new Map(variants.map((option) => [option.variant.id, option]));
  const unchanged = items.length === order.items.length && items.every((line) => order.items.some((item) => item.variantId === line.variantId && item.quantity === Number(line.quantity)));
  const subtotal = unchanged ? order.subtotal : items.reduce((total, line) => total + Number(variantsById.get(line.variantId)?.variant.effectivePrice ?? 0) * (Number(line.quantity) || 0), 0).toFixed(2);

  function setContactField(field: keyof OrderContact, value: string) {
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
      <DialogContent className="order-edit-dialog">
        <DialogTitle>Edit order {order.id.slice(0, 8).toUpperCase()}</DialogTitle>
        <DialogDescription>Changes stay pending for customer agreement. Item changes use current catalogue prices and update reserved stock.</DialogDescription>
        <form className="order-edit-form" onSubmit={submit}>
          <div className="order-edit-contact">
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
              Delivery area
              <Input value={contact.deliveryArea} onChange={(event) => setContactField("deliveryArea", event.target.value)} required maxLength={120} />
            </Label>
            <Label className="order-edit-wide">
              Delivery address
              <textarea className="ui-textarea" value={contact.deliveryAddress} onChange={(event) => setContactField("deliveryAddress", event.target.value)} required minLength={5} maxLength={500} />
            </Label>
            <Label className="order-edit-wide">
              Order note
              <textarea className="ui-textarea" value={contact.customerNote} onChange={(event) => setContactField("customerNote", event.target.value)} maxLength={1000} />
            </Label>
          </div>
          <div className="order-edit-heading">
            <h3>Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus size={14} /> Add item
            </Button>
          </div>
          <div className="order-edit-lines">
            {items.map((item, index) => {
              const original = order.items.find((line) => line.variantId === item.variantId);
              const existingVariantUnavailable = item.variantId && !variantsById.has(item.variantId);
              return (
                <div className="order-edit-line" key={`${order.id}-${index}`}>
                  <Label className="order-edit-variant">
                    Variant
                    <select className="ui-input" aria-label={`Variant for item ${index + 1}`} value={item.variantId} onChange={(event) => setLine(index, { variantId: event.target.value })}>
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
                  <Label className="order-edit-quantity">
                    Quantity
                    <Input aria-label={`Quantity for item ${index + 1}`} type="number" min="1" max={item.variantId ? maximumFor(item.variantId) : 20} step="1" value={item.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} required />
                  </Label>
                  <Button type="button" variant="ghost" size="icon" title="Remove item" aria-label={`Remove item ${index + 1}`} onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              );
            })}
          </div>
          {productsLoading && (
            <p role="status" className="muted">
              Loading available variants...
            </p>
          )}
          <div className="order-edit-total">
            <span>{unchanged ? "Current subtotal" : "Recalculated subtotal"}</span>
            <strong>{money(subtotal)}</strong>
          </div>
          {error && (
            <p role="alert" className="status-message">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button disabled={isLoading || !items.length || (productsLoading && !unchanged)}>Save order</Button>
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
      <div className="admin-title">
        <div>
          <span className="eyebrow">Commerce</span>
          <h1>Orders</h1>
        </div>
      </div>
      {(error || actionError) && (
        <div role="alert" className="status-message">
          {actionError || "Unable to load orders."}{" "}
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}
      <div className="table-scroll" aria-busy={isFetching}>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Delivery</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.id.slice(0, 8).toUpperCase()}</strong>
                  <small>{new Date(order.createdAt).toLocaleString()}</small>
                </td>
                <td>
                  {order.customerName}
                  <small>
                    <a href={`mailto:${order.email}`}>{order.email}</a>
                    <br />
                    {order.phone}
                  </small>
                </td>
                <td>
                  {order.deliveryArea}
                  <small>{order.deliveryAddress}</small>
                  {order.customerNote && <small>Note: {order.customerNote}</small>}
                </td>
                <td>
                  {order.items.map((item) => (
                    <small key={item.id}>
                      {item.quantity} × {item.productName} · {item.variantName} ({item.sku})
                    </small>
                  ))}
                </td>
                <td>{money(order.subtotal)}</td>
                <td>
                  <span className={`status-tag ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span>
                </td>
                <td>
                  {order.status === "PENDING_REVIEW" ? (
                    <div className="row-actions">
                      <Button variant="ghost" size="icon" title="Edit order" aria-label={`Edit order for ${order.customerName}`} onClick={() => setEditingOrder(order)}>
                        <Pencil size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" title="Confirm order and consume reserved stock" aria-label="Confirm order" disabled={isLoading} onClick={() => void review(order.id, "CONFIRMED")}>
                        <Check size={16} />
                      </Button>
                      <Confirm
                        title="Reject order?"
                        description="Rejecting this order releases its reserved stock."
                        onConfirm={() => review(order.id, "REJECTED")}
                        trigger={
                          <Button variant="ghost" size="icon" title="Reject order" aria-label="Reject order" disabled={isLoading}>
                            <X size={16} />
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data?.items.length && !isFetching && <div className="empty-state">No orders yet.</div>}
      {editingOrder && <OrderEditor key={editingOrder.id} order={editingOrder} close={() => setEditingOrder(undefined)} />}
    </>
  );
}
