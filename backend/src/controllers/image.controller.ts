import type { RequestHandler } from "express";
import * as service from "../services/image.service.ts";
import { uploadInput, imagePatch, imageOrder } from "../validators/catalogue.validator.ts";

export const upload: RequestHandler = async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  res.status(201).json({
    items: await service.uploadImages(
      uploadInput.parse(req.body),
      files.map((file) => file.buffer),
    ),
  });
};
export const update: RequestHandler = async (req, res) => {
  res.json(await service.updateImage(String(req.params.id), imagePatch.parse(req.body)));
};
export const remove: RequestHandler = async (req, res) => {
  await service.deleteImage(String(req.params.id));
  res.status(204).end();
};
export const reorder: RequestHandler = async (req, res) => {
  res.json(await service.reorderImages(String(req.params.id), imageOrder.parse(req.body).imageIds));
};
