import { Router, urlencoded } from "express";
import * as payments from "../controllers/payment.controller.ts";

export const paymentCallbackRouter = Router();
paymentCallbackRouter.use(urlencoded({ extended: false, limit: "16kb", parameterLimit: 100 }));
paymentCallbackRouter.post("/ipn", payments.ipn);
paymentCallbackRouter.post("/success", payments.browserReturn);
paymentCallbackRouter.post("/fail", payments.browserReturn);
paymentCallbackRouter.post("/cancel", payments.browserReturn);
