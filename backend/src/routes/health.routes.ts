import { Router } from "express";
import { live, ready } from "../controllers/health.controller.ts";

export const healthRouter = Router();
healthRouter.get("/health", live);
healthRouter.get("/ready", ready);
