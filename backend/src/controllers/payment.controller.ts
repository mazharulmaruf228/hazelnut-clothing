import type { RequestHandler } from "express";
import { z } from "zod";
import * as payments from "../services/payment.service.ts";
import { cancelRefundInput } from "../validators/catalogue.validator.ts";

export const methods: RequestHandler = (_req, res) => {
  res.json(payments.paymentMethods());
};
export const status: RequestHandler = async (req, res) => {
  res.json(await payments.paymentStatus(z.uuid().parse(req.params.id), (req.get("authorization") ?? "").replace(/^Bearer /, "")));
};
export const webhook: RequestHandler = async (req, res) => {
  await payments.handleStripeWebhook(req.body, req.get("stripe-signature") ?? "");
  res.json({ received: true });
};
export const cancelRefund: RequestHandler = async (req, res) => {
  cancelRefundInput.parse(req.body);
  res.json(await payments.cancelAndRefund(z.uuid().parse(req.params.id)));
};
