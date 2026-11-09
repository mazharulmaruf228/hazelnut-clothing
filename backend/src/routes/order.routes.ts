import { Router } from "express";
import * as orders from "../controllers/order.controller.ts";
import { orderLimit } from "../middleware/rate-limit.middleware.ts";

export const publicOrderRouter = Router();
publicOrderRouter.post("/", orderLimit, orders.create);

export const adminOrderRouter = Router();
adminOrderRouter.get("/", orders.list);
adminOrderRouter.patch("/:id", orders.edit);
adminOrderRouter.patch("/:id/status", orders.updateStatus);
