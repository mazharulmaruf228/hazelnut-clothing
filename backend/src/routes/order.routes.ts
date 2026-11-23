import { Router } from "express";
import * as orders from "../controllers/order.controller.ts";
import * as payments from "../controllers/payment.controller.ts";
import { adminOnly } from "../middleware/auth.middleware.ts";
import { orderLimit, orderLookupLimit, paymentResumeLimit, paymentStatusLimit } from "../middleware/rate-limit.middleware.ts";

export const publicOrderRouter = Router();
publicOrderRouter.get("/delivery-options", orders.deliveryOptions);
publicOrderRouter.get("/payment-mode", orders.mode);
publicOrderRouter.post("/payment-status", paymentStatusLimit, orders.paymentStatus);
publicOrderRouter.post("/guest-payment-status", paymentStatusLimit, orders.guestPaymentStatus);
publicOrderRouter.post("/resume-payment", paymentResumeLimit, orders.resumePayment);
publicOrderRouter.post("/lookup", orderLookupLimit, orders.lookup);
publicOrderRouter.post("/", orderLimit, orders.create);

export const adminOrderRouter = Router();
adminOrderRouter.get("/", orders.list);
adminOrderRouter.patch("/:id", orders.edit);
adminOrderRouter.patch("/:id/status", orders.updateStatus);
adminOrderRouter.post("/:id/payment/risk-review", adminOnly, payments.riskReview);
adminOrderRouter.post("/:id/payment/refund", adminOnly, payments.refund);
adminOrderRouter.post("/:id/payment/duplicate/:chargeId/refund", adminOnly, payments.duplicateRefund);
