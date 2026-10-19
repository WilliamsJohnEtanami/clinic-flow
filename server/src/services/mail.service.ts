import nodemailer from "nodemailer";
import { env } from "@/config/env";
import { ServiceUnavailableError } from "@/utils/errors";

export function isPasswordResetMailConfigured(): boolean {
  return Boolean(
    env.mail.host && env.mail.user && env.mail.password && env.mail.from && env.mail.frontendUrl,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const { host, port, secure, user, password, from, frontendUrl } = env.mail;
  if (!host || !user || !password || !from || !frontendUrl) {
    throw new ServiceUnavailableError(
      "Password reset email is not configured. Contact the clinic administrator.",
    );
  }

  const resetUrl = new URL("/auth", frontendUrl);
  resetUrl.searchParams.set("mode", "reset");
  resetUrl.searchParams.set("token", token);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: secure || port === 465,
    requireTLS: port === 587,
    auth: { user, pass: password },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Reset your VitaFlow password",
      text: `Use this link to reset your VitaFlow password. It expires in 30 minutes: ${resetUrl.href}`,
      html: `<p>Use the link below to reset your VitaFlow password. It expires in 30 minutes.</p><p><a href="${resetUrl.href}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "unknown";
    console.error("Password reset email delivery failed.", { code });
    throw new ServiceUnavailableError(
      "Password reset email could not be sent. Check the mail configuration and try again.",
    );
  }
}
