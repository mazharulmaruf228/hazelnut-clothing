import type { RequestHandler } from "express";
import { getOverview } from "../services/overview.service.ts";

export const overview: RequestHandler = async (req, res) => {
  res.json(await getOverview(req.admin!.role === "ADMIN"));
};
