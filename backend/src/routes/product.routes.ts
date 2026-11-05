import { Router } from "express";
import * as products from "../controllers/product.controller.ts";
import * as variants from "../controllers/variant.controller.ts";

export const publicProductRouter = Router();
publicProductRouter.get("/", products.listPublic);
publicProductRouter.get("/:slug", products.getPublic);

export const adminProductRouter = Router();
adminProductRouter.get("/", products.listAdmin);
adminProductRouter.get("/:id", products.getAdmin);
adminProductRouter.post("/", products.create);
adminProductRouter.patch("/:id", products.update);
adminProductRouter.delete("/:id", products.remove);
adminProductRouter.post("/:id/variants", variants.create);

export const variantRouter = Router();
variantRouter.patch("/:id", variants.update);
variantRouter.delete("/:id", variants.remove);
