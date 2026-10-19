import type { Response } from "express";
import * as authService from "@/services/auth.service";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  refreshSchema,
  registerSchema,
} from "@/validation/auth.schema";
import { asyncHandler } from "@/utils/async-handler";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";

export const registerHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.status(200).json(result);
});

export const refreshHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.status(200).json(result);
});

export const logoutHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) await authService.logout(parsed.data.refreshToken);
  res.status(204).send();
});

export const requestPasswordResetHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const input = passwordResetRequestSchema.parse(req.body);
    await authService.requestPasswordReset(input);
    res.status(202).json({
      message: "If an active account matches that email, a password reset link will be sent.",
    });
  },
);

export const resetPasswordHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const input = passwordResetSchema.parse(req.body);
    await authService.resetPassword(input);
    res.status(204).send();
  },
);
