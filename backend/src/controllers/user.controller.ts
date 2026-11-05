import type { RequestHandler } from "express";
import * as userService from "../services/user.service.ts";
import { newUser, userPatch } from "../validators/auth.validator.ts";

export const list: RequestHandler = async (_req, res) => {
  res.json({ items: await userService.listUsers() });
};
export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await userService.createUser(newUser.parse(req.body)));
};
export const update: RequestHandler = async (req, res) => {
  res.json(await userService.updateUser(String(req.params.id), userPatch.parse(req.body)));
};
export const remove: RequestHandler = async (req, res) => {
  await userService.deleteUser(String(req.params.id));
  res.status(204).end();
};
