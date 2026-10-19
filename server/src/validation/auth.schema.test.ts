import { describe, expect, it } from "vitest";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema,
} from "./auth.schema";

describe("auth schemas", () => {
  it("normalizes email addresses for registration and login", () => {
    expect(
      registerSchema.parse({
        email: "  PATIENT@example.com ",
        password: "password",
        fullName: "Test Patient",
        role: "PATIENT",
        matricNumber: "STU-1",
      }).email,
    ).toBe("patient@example.com");
    expect(loginSchema.parse({ email: "PATIENT@example.com", password: "password" }).email).toBe(
      "patient@example.com",
    );
  });

  it("accepts a valid reset request and enforces a long single-use token/password shape", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "person@example.com" }).success).toBe(
      true,
    );
    expect(
      passwordResetSchema.safeParse({
        token: "a".repeat(64),
        password: "new-password",
      }).success,
    ).toBe(true);
    expect(
      passwordResetSchema.safeParse({ token: "short", password: "new-password" }).success,
    ).toBe(false);
    expect(
      passwordResetSchema.safeParse({ token: "a".repeat(64), password: "short" }).success,
    ).toBe(false);
  });
});
