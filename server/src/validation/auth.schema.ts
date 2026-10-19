import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2),
  role: z.literal("PATIENT"),
  matricNumber: z.string().trim().min(1).max(30),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired reset link"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
