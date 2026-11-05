import { Router } from "express";
import * as controller from "../controllers/image.controller.ts";
import { uploadImages } from "../middleware/upload.middleware.ts";
import { uploadLimit } from "../middleware/rate-limit.middleware.ts";

export const imageRouter = Router();
imageRouter.post("/uploads", uploadLimit, uploadImages, controller.upload);
imageRouter.patch("/images/:id", controller.update);
imageRouter.delete("/images/:id", controller.remove);
imageRouter.patch("/products/:id/images/order", controller.reorder);
