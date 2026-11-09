import { Router } from "express";
import { authRouter } from "./auth.routes.ts";
import { usersRouter } from "./user.routes.ts";
import { publicProductRouter } from "./product.routes.ts";
import { publicCategoryRouter } from "./category.routes.ts";
import { adminRouter } from "./admin.routes.ts";
import { publicOrderRouter } from "./order.routes.ts";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin/users", usersRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/products", publicProductRouter);
apiRouter.use("/categories", publicCategoryRouter);
apiRouter.use("/orders", publicOrderRouter);
