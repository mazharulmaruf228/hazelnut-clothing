import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { write } from "../config/database.ts";
import { orderModel } from "../models/order.model.ts";
import { HttpError } from "../utils/http-error.ts";
import { effectivePrice } from "../utils/money.ts";
import type { createOrderInput, orderEditInput } from "../validators/catalogue.validator.ts";

type CreateOrderInput = z.infer<typeof createOrderInput>;
type OrderEditInput = z.infer<typeof orderEditInput>;

function orderDto(order: Awaited<ReturnType<typeof orderModel.findById>>) {
  return {
    ...order,
    subtotal: order.subtotal.toFixed(2),
    items: order.items.map((item) => ({ ...item, unitPrice: item.unitPrice.toFixed(2), lineTotal: item.lineTotal.toFixed(2) })),
  };
}

export async function createOrder(input: CreateOrderInput) {
  return write(async (client) => {
    const variants = await client.productVariant.findMany({
      where: { id: { in: input.items.map((item) => item.variantId) } },
      include: { product: true },
    });
    if (variants.length !== input.items.length) throw new HttpError(409, "One or more selected options are no longer available");
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    let subtotal = new Prisma.Decimal(0);

    for (const requested of input.items) {
      const variant = byId.get(requested.variantId)!;
      if (variant.product.status !== "PUBLISHED" || !variant.isActive) throw new HttpError(409, "One or more selected options are no longer available");
      if (variant.stockOnHand - variant.stockReserved < requested.quantity) throw new HttpError(409, `Not enough stock for ${variant.name}`);

      const unitPrice = new Prisma.Decimal(effectivePrice(variant.product.price.toString(), variant.price?.toString() ?? null, variant.product.discountPercentage.toString()));
      const lineTotal = unitPrice.mul(requested.quantity);
      subtotal = subtotal.add(lineTotal);
      orderItems.push({
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: requested.quantity,
        unitPrice,
        lineTotal,
      });
      await client.productVariant.update({ where: { id: variant.id }, data: { stockReserved: { increment: requested.quantity } } });
    }

    const order = await orderModel.create(
      {
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        deliveryAddress: input.deliveryAddress,
        deliveryArea: input.deliveryArea,
        customerNote: input.customerNote,
        subtotal,
        items: { create: orderItems },
      },
      client,
    );
    return { id: order.id, status: order.status, subtotal: order.subtotal.toFixed(2) };
  });
}

export async function listOrders() {
  return (await orderModel.list()).map(orderDto);
}

export async function editOrder(id: string, input: OrderEditInput) {
  return write(async (client) => {
    const order = await orderModel.findById(id, client);
    if (order.status !== "PENDING_REVIEW") throw new HttpError(409, "Only pending orders can be edited");
    if (order.updatedAt.getTime() !== new Date(input.updatedAt).getTime()) throw new HttpError(409, "This order changed since it was opened. Reload and try again.");

    const previousItems = order.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })).sort((first, second) => (first.variantId ?? "").localeCompare(second.variantId ?? ""));
    const nextItems = [...input.items].sort((first, second) => first.variantId.localeCompare(second.variantId));
    const itemsChanged = previousItems.length !== nextItems.length || previousItems.some((item, index) => item.variantId !== nextItems[index]?.variantId || item.quantity !== nextItems[index]?.quantity);

    let subtotal = order.subtotal;
    if (itemsChanged) {
      if (order.items.some((item) => item.variantId === null)) throw new HttpError(409, "A removed product option cannot be edited");
      const variants = await client.productVariant.findMany({
        where: { id: { in: nextItems.map((item) => item.variantId) } },
        include: { product: true },
      });
      if (variants.length !== nextItems.length) throw new HttpError(409, "One or more selected options no longer exist");
      const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
      const oldQuantities = new Map<string, number>();
      const newQuantities = new Map(nextItems.map((item) => [item.variantId, item.quantity]));
      for (const item of order.items) {
        if (item.variantId) oldQuantities.set(item.variantId, (oldQuantities.get(item.variantId) ?? 0) + item.quantity);
      }

      for (const variantId of new Set([...oldQuantities.keys(), ...newQuantities.keys()])) {
        const delta = (newQuantities.get(variantId) ?? 0) - (oldQuantities.get(variantId) ?? 0);
        if (delta > 0) {
          const variant = variantsById.get(variantId);
          if (!variant || variant.product.status !== "PUBLISHED" || !variant.isActive) throw new HttpError(409, "One or more selected options are no longer available");
          if (variant.stockOnHand - variant.stockReserved < delta) throw new HttpError(409, `Not enough stock for ${variant.name}`);
          await client.productVariant.update({ where: { id: variantId }, data: { stockReserved: { increment: delta } } });
        } else if (delta < 0) {
          const released = await client.productVariant.updateMany({
            where: { id: variantId, stockReserved: { gte: -delta } },
            data: { stockReserved: { decrement: -delta } },
          });
          if (released.count !== 1) throw new HttpError(409, "Reserved stock changed; the order could not be edited");
        }
      }

      const orderItems: Prisma.OrderItemCreateManyInput[] = [];
      subtotal = new Prisma.Decimal(0);
      for (const item of nextItems) {
        const variant = variantsById.get(item.variantId)!;
        if (variant.product.status !== "PUBLISHED" || !variant.isActive) throw new HttpError(409, "One or more selected options are no longer available");
        const unitPrice = new Prisma.Decimal(effectivePrice(variant.product.price.toString(), variant.price?.toString() ?? null, variant.product.discountPercentage.toString()));
        const lineTotal = unitPrice.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);
        orderItems.push({
          orderId: id,
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          sku: variant.sku,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        });
      }
      await orderModel.replaceItems(id, orderItems, client);
    }

    return orderDto(
      await orderModel.update(
        id,
        {
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          deliveryAddress: input.deliveryAddress,
          deliveryArea: input.deliveryArea,
          customerNote: input.customerNote,
          ...(itemsChanged ? { subtotal } : {}),
        },
        client,
      ),
    );
  });
}

export async function updateOrderStatus(id: string, status: "CONFIRMED" | "REJECTED") {
  return write(async (client) => {
    const order = await orderModel.findById(id, client);
    if (order.status === status) return orderDto(order);
    if (order.status !== "PENDING_REVIEW") throw new HttpError(409, "Only pending orders can be reviewed");

    for (const item of order.items) {
      if (!item.variantId) continue;
      const updated = await client.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockReserved: { gte: item.quantity },
          ...(status === "CONFIRMED" ? { stockOnHand: { gte: item.quantity } } : {}),
        },
        data: status === "CONFIRMED" ? { stockReserved: { decrement: item.quantity }, stockOnHand: { decrement: item.quantity } } : { stockReserved: { decrement: item.quantity } },
      });
      if (updated.count !== 1) throw new HttpError(409, "Reserved stock changed; the order could not be reviewed");
    }

    return orderDto(await orderModel.updateStatus(id, status, client));
  });
}
