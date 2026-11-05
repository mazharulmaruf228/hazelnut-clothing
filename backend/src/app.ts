import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { apiRouter } from "./routes/index.ts";
import { apiLimit } from "./middleware/rate-limit.middleware.ts";
import { errorHandler } from "./middleware/error.middleware.ts";
import { healthRouter } from "./routes/health.routes.ts";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet(), cookieParser(), express.json({ limit: "256kb" }));
app.use((_req, res, next) => {
  res.locals.requestId = randomUUID();
  res.setHeader("X-Request-ID", res.locals.requestId);
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", healthRouter);
app.use("/api", apiLimit, apiRouter);
app.use((_req, res) => res.status(404).json({ error: { message: "Not found", requestId: res.locals.requestId } }));
app.use(errorHandler);
