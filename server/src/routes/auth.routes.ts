import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  requestPasswordResetHandler,
  resetPasswordHandler,
} from "@/controllers/auth.controller";
import { authRateLimiter, passwordResetRateLimiter } from "@/middleware/rate-limit.middleware";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, registerHandler);
authRouter.post("/login", authRateLimiter, loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
authRouter.post("/password-reset/request", passwordResetRateLimiter, requestPasswordResetHandler);
authRouter.post("/password-reset/confirm", passwordResetRateLimiter, resetPasswordHandler);
