import { Router } from "express";
import * as controller from "../controllers/user.controller.ts";
import { requireAuth, adminOnly, csrf } from "../middleware/auth.middleware.ts";

export const usersRouter = Router();
usersRouter.use(requireAuth, adminOnly, csrf);
usersRouter.get("/", controller.list);
usersRouter.post("/", controller.create);
usersRouter.patch("/:id", controller.update);
usersRouter.delete("/:id", controller.remove);
