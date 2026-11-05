import { Router } from "express";
import * as controller from "../controllers/category.controller.ts";

export const publicCategoryRouter = Router();
publicCategoryRouter.get("/", controller.listPublic);

export const adminCategoryRouter = Router();
adminCategoryRouter.get("/", controller.listAdmin);
adminCategoryRouter.post("/", controller.create);
adminCategoryRouter.patch("/:id", controller.update);
adminCategoryRouter.delete("/:id", controller.remove);
