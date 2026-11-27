import type { OrderRecord } from "../models/order.model.ts";

export function orderReceipt(order: OrderRecord) {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: order.subtotal.toFixed(2),
    deliveryCharge: order.deliveryCharge.toFixed(2),
    total: order.subtotal.add(order.deliveryCharge).toFixed(2),
  };
}
