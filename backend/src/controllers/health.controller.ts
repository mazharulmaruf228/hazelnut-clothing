import type { RequestHandler } from "express";
import { checkReadiness } from "../services/health.service.ts";

export const live: RequestHandler = (_req, res) => {
  res.json({ status: "ok" });
};
export const ready: RequestHandler = async (_req, res) => {
  res.json(await checkReadiness());
};
