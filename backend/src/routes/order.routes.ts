import { Router } from "express";
import * as orders from "../controllers/order.controller.ts";
import { orderLimit, orderLookupLimit } from "../middleware/rate-limit.middleware.ts";

export const publicOrderRouter = Router();
publicOrderRouter.get("/delivery-options", orders.deliveryOptions);
publicOrderRouter.post("/lookup", orderLookupLimit, orders.lookup);
publicOrderRouter.post("/", orderLimit, orders.create);

export const adminOrderRouter = Router();
adminOrderRouter.get("/", orders.list);
adminOrderRouter.patch("/:id", orders.edit);
adminOrderRouter.patch("/:id/status", orders.updateStatus);
