import type { RequestHandler } from "express";
import { z } from "zod";
import { config } from "../config/env.ts";
import { orderForPaymentReturn, recordDuplicateRefund, recordRefund, reviewRisk, validatePayment } from "../services/payment.service.ts";

const notification = z.object({ val_id: z.string().min(1).max(100).optional(), tran_id: z.string().min(1).max(30).optional() });

export const ipn: RequestHandler = async (req, res) => {
  const { val_id: validationId } = notification.parse(req.body);
  if (validationId) await validatePayment(validationId);
  res.sendStatus(200);
};

export const browserReturn: RequestHandler = async (req, res) => {
  const { val_id: validationId, tran_id: transactionId } = notification.parse(req.body);
  if (validationId) {
    try {
      await validatePayment(validationId);
    } catch {
      console.error({ event: "payment_return_validation_unavailable" });
    }
  }
  const destination = new URL("/payment-return", config.PUBLIC_ORIGIN);
  const orderId = await orderForPaymentReturn(transactionId);
  if (orderId) destination.searchParams.set("order", orderId);
  res.redirect(303, destination.href);
};

export const riskReview: RequestHandler = async (req, res) => {
  const { decision } = z
    .object({ decision: z.enum(["APPROVE", "REJECT"]) })
    .strict()
    .parse(req.body);
  await reviewRisk(z.uuid().parse(req.params.id), decision);
  res.sendStatus(204);
};

export const refund: RequestHandler = async (req, res) => {
  const input = z
    .object({ amount: z.string().regex(/^\d{1,10}\.\d{2}$/), reference: z.string().trim().min(1).max(100), note: z.string().trim().min(1).max(500) })
    .strict()
    .parse(req.body);
  await recordRefund(z.uuid().parse(req.params.id), input.amount, input.reference, input.note, req.admin!.id);
  res.sendStatus(204);
};

export const duplicateRefund: RequestHandler = async (req, res) => {
  const input = z
    .object({ amount: z.string().regex(/^\d{1,10}\.\d{2}$/), reference: z.string().trim().min(1).max(100), note: z.string().trim().min(1).max(500) })
    .strict()
    .parse(req.body);
  await recordDuplicateRefund(z.uuid().parse(req.params.id), z.uuid().parse(req.params.chargeId), input.amount, input.reference, input.note, req.admin!.id);
  res.sendStatus(204);
};
