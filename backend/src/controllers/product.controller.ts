import type { RequestHandler } from "express";
import * as service from "../services/product.service.ts";
import { createProductInput, productPatch } from "../validators/catalogue.validator.ts";

export const listPublic: RequestHandler = async (req, res) => {
  res.json(await service.listProducts(req.query));
};
export const getPublic: RequestHandler = async (req, res) => {
  res.json(await service.getPublishedProduct(String(req.params.slug)));
};
export const listAdmin: RequestHandler = async (req, res) => {
  res.json(await service.listProducts(req.query, true));
};
export const getAdmin: RequestHandler = async (req, res) => {
  res.json(await service.getAdminProduct(String(req.params.id)));
};
export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await service.createProduct(createProductInput.parse(req.body)));
};
export const update: RequestHandler = async (req, res) => {
  res.json(await service.updateProduct(String(req.params.id), productPatch.parse(req.body)));
};
export const remove: RequestHandler = async (req, res) => {
  await service.deleteProduct(String(req.params.id));
  res.status(204).end();
};
