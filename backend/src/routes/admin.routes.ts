import { Router } from "express";
import { requireAuth, csrf } from "../middleware/auth.middleware.ts";
import { overview } from "../controllers/overview.controller.ts";
import { adminProductRouter, variantRouter } from "./product.routes.ts";
import { adminCategoryRouter } from "./category.routes.ts";
import { imageRouter } from "./image.routes.ts";

export const adminRouter = Router();
adminRouter.use(requireAuth, csrf);
adminRouter.get("/overview", overview);
adminRouter.use("/products", adminProductRouter);
adminRouter.use("/categories", adminCategoryRouter);
adminRouter.use("/variants", variantRouter);
adminRouter.use(imageRouter);
