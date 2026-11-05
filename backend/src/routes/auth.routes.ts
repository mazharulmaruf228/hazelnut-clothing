import { Router } from "express";
import * as controller from "../controllers/auth.controller.ts";
import { csrf, requireAuth } from "../middleware/auth.middleware.ts";
import { authLimit } from "../middleware/rate-limit.middleware.ts";

export const authRouter = Router();
authRouter.get("/csrf", controller.issueCsrf);
authRouter.post("/login", authLimit, csrf, controller.login);
authRouter.post("/refresh", authLimit, csrf, controller.refresh);
authRouter.post("/logout", csrf, controller.logout);
authRouter.get("/me", requireAuth, controller.me);
authRouter.post("/password", requireAuth, csrf, controller.changePassword);
authRouter.get("/google", authLimit, controller.startGoogle);
authRouter.get("/google/link", authLimit, requireAuth, controller.startGoogle);
authRouter.get("/google/callback", authLimit, controller.finishGoogle);
