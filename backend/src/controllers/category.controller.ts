import type { RequestHandler } from "express";
import * as service from "../services/category.service.ts";
import { categoryInput, categoryPatch } from "../validators/catalogue.validator.ts";

export const listPublic: RequestHandler = async (_req, res) => {
  res.json({ items: await service.listPublicCategories() });
};
export const listAdmin: RequestHandler = async (_req, res) => {
  res.json({ items: await service.listCategories() });
};
export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await service.createCategory(categoryInput.parse(req.body)));
};
export const update: RequestHandler = async (req, res) => {
  res.json(await service.updateCategory(String(req.params.id), categoryPatch.parse(req.body)));
};
export const remove: RequestHandler = async (req, res) => {
  await service.deleteCategory(String(req.params.id));
  res.status(204).end();
};
