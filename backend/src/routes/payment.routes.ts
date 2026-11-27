import { Router, raw } from "express";
import { webhook } from "../controllers/payment.controller.ts";

export const stripeWebhookRouter = Router();
stripeWebhookRouter.post("/", raw({ type: "application/json", limit: "256kb" }), webhook);
