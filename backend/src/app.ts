import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { apiRouter } from "./routes/index.ts";
import { apiLimit, paymentCallbackLimit } from "./middleware/rate-limit.middleware.ts";
import { errorHandler } from "./middleware/error.middleware.ts";
import { healthRouter } from "./routes/health.routes.ts";
import { paymentCallbackRouter } from "./routes/payment.routes.ts";
import { isAllowedOrigin } from "./config/env.ts";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.vary("Origin");
  const origin = req.get("origin");
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS" && req.get("access-control-request-method")) {
    if (!isAllowedOrigin(origin)) return res.sendStatus(403);
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token, Authorization");
    return res.sendStatus(204);
  }
  next();
});
app.use(helmet(), cookieParser(), express.json({ limit: "256kb" }));
app.use((_req, res, next) => {
  res.locals.requestId = randomUUID();
  res.setHeader("X-Request-ID", res.locals.requestId);
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", healthRouter);
app.use("/api/payments", paymentCallbackLimit, paymentCallbackRouter);
app.use("/api", apiLimit, apiRouter);
app.use((_req, res) => res.status(404).json({ error: { message: "Not found", requestId: res.locals.requestId } }));
app.use(errorHandler);
