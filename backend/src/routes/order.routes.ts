import { Router } from "express";
import * as orders from "../controllers/order.controller.ts";
import { orderLimit, orderLookupLimit } from "../middleware/rate-limit.middleware.ts";
import * as payments from "../controllers/payment.controller.ts";
import { adminOnly } from "../middleware/auth.middleware.ts";
import { paymentStatusLimit } from "../middleware/rate-limit.middleware.ts";

export const publicOrderRouter = Router();
publicOrderRouter.get("/delivery-options", orders.deliveryOptions);
publicOrderRouter.get("/payment-methods", payments.methods);
publicOrderRouter.get("/:id/payment", paymentStatusLimit, payments.status);
publicOrderRouter.post("/lookup", orderLookupLimit, orders.lookup);
publicOrderRouter.post("/", orderLimit, orders.create);

export const adminOrderRouter = Router();
adminOrderRouter.get("/", orders.list);
adminOrderRouter.patch("/:id", orders.edit);
adminOrderRouter.patch("/:id/status", orders.updateStatus);
adminOrderRouter.post("/:id/cancel-refund", adminOnly, payments.cancelRefund);
