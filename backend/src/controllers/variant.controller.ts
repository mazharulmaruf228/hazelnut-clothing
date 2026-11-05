import type { RequestHandler } from "express";
import * as service from "../services/variant.service.ts";
import { variantInput, variantPatch } from "../validators/catalogue.validator.ts";

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await service.createVariant(String(req.params.id), variantInput.parse(req.body)));
};
export const update: RequestHandler = async (req, res) => {
  res.json(await service.updateVariant(String(req.params.id), variantPatch.parse(req.body)));
};
export const remove: RequestHandler = async (req, res) => {
  res.json(await service.deleteVariant(String(req.params.id)));
};
