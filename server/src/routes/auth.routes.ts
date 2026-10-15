import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
} from "@/controllers/auth.controller";
import { authRateLimiter } from "@/middleware/rate-limit.middleware";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, registerHandler);
authRouter.post("/login", authRateLimiter, loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
