import type { RequestHandler } from "express";
import * as service from "../services/order.service.ts";
import { createOrderInput, orderEditInput, orderLookupInput, orderStatusInput } from "../validators/catalogue.validator.ts";
import { z } from "zod";

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await service.createOrder(createOrderInput.parse(req.body)));
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
