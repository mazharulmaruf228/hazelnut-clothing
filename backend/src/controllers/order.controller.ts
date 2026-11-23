import type { RequestHandler } from "express";
import * as service from "../services/order.service.ts";
import * as payment from "../services/payment.service.ts";
import { createOrderInput, orderEditInput, orderLookupInput, orderStatusInput } from "../validators/catalogue.validator.ts";
import { z } from "zod";
import { HttpError } from "../utils/http-error.ts";

export const create: RequestHandler = async (req, res) => {
  const input = createOrderInput.parse(req.body);
  if (payment.checkoutMode() === "sslcommerz_sandbox") {
    const key = z.uuid().parse(req.get("idempotency-key"));
    res.status(201).json(await payment.createSandboxOrder(input, key));
    return;
  }
  if (req.get("idempotency-key")) {
    const key = z.uuid().parse(req.get("idempotency-key"));
    if (!(await payment.hasCheckout(key))) throw new HttpError(409, "Checkout mode changed; reload checkout before placing an order");
    res.status(201).json(await payment.createSandboxOrder(input, key));
    return;
  }
  res.status(201).json(await service.createOrder(input));
};
export const mode: RequestHandler = (_req, res) => {
  res.json({ mode: payment.checkoutMode() });
};
export const paymentStatus: RequestHandler = async (req, res) => {
  const { key } = z.object({ key: z.uuid() }).strict().parse(req.body);
  res.json(await payment.checkoutStatus(key));
};
export const resumePayment: RequestHandler = async (req, res) => {
  res.json(await payment.resumeGuestPayment(orderLookupInput.parse(req.body)));
};
export const guestPaymentStatus: RequestHandler = async (req, res) => {
  const input = z
    .object({ orderId: z.uuid(), statusToken: z.string().min(1).max(2048) })
    .strict()
    .parse(req.body);
  res.json(await payment.guestPaymentStatus(input.orderId, input.statusToken));
};
export const list: RequestHandler = async (_req, res) => {
  res.json({ items: await service.listOrders() });
};
export const deliveryOptions: RequestHandler = (_req, res) => {
  res.json({ items: service.getDeliveryOptions() });
};
export const lookup: RequestHandler = async (req, res) => {
  res.json(await service.lookupGuestOrder(orderLookupInput.parse(req.body)));
};
export const updateStatus: RequestHandler = async (req, res) => {
  res.json(await service.updateOrderStatus(z.uuid().parse(req.params.id), orderStatusInput.parse(req.body).status));
};
export const edit: RequestHandler = async (req, res) => {
  res.json(await service.editOrder(z.uuid().parse(req.params.id), orderEditInput.parse(req.body)));
};
