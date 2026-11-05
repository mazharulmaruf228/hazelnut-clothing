import { Router } from "express";
import { requireAuth, csrf } from "../middleware/auth.middleware.ts";
import { authRouter } from "./auth.routes.ts";
import { usersRouter } from "./user.routes.ts";
import { publicProductRouter, adminProductRouter, variantRouter } from "./product.routes.ts";
import { publicCategoryRouter, adminCategoryRouter } from "./category.routes.ts";
import { imageRouter } from "./image.routes.ts";
import { overview } from "../controllers/overview.controller.ts";

export const apiRouter = Router();
const adminRouter = Router();
adminRouter.use(requireAuth, csrf);
adminRouter.get("/overview", overview);
adminRouter.use("/products", adminProductRouter);
adminRouter.use("/categories", adminCategoryRouter);
adminRouter.use("/variants", variantRouter);
adminRouter.use(imageRouter);

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin/users", usersRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/products", publicProductRouter);
apiRouter.use("/categories", publicCategoryRouter);
