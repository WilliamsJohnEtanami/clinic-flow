import crypto from "crypto";
import { prisma } from "@/config/prisma";
import { hashPassword, verifyPassword } from "@/utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/utils/jwt";
import { ConflictError, UnauthorizedError } from "@/utils/errors";
import { env } from "@/config/env";
import type { RegisterInput, LoginInput } from "@/validation/auth.schema";

interface AuthResult {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    specialty: string | null;
    matricNumber: string | null;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
  return value * multiplier;
}

async function issueTokens(user: { id: string; email: string; role: string }): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role as never,
    email: user.email,
  });

  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, tokenId });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + ttlToMs(env.jwt.refreshTtl)),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with that email already exists.");
  const existingPatient = await prisma.patient.findUnique({
    where: { matricNumber: input.matricNumber },
    select: { id: true },
  });
  if (existingPatient) {
    throw new ConflictError(
      "A patient profile with this matric number already exists. Contact the clinic to link it.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      ...(input.role === "PATIENT"
        ? {
            patient: {
              create: {
                fullName: input.fullName,
                matricNumber: input.matricNumber,
                email: input.email,
              },
            },
          }
        : {}),
    },
    include: { patient: true },
  });

  const { accessToken, refreshToken } = await issueTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialty: user.specialty,
      matricNumber: user.patient?.matricNumber ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { patient: true },
  });
  if (!user || !user.isActive) throw new UnauthorizedError("Invalid email or password.");

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new UnauthorizedError("Invalid email or password.");

  const { accessToken, refreshToken } = await issueTokens(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      specialty: user.specialty,
      matricNumber: user.patient?.matricNumber ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token has been revoked or expired.");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new UnauthorizedError("Account no longer active.");

  // Rotate: revoke the old token, issue a new pair.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  return issueTokens(user);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revoked: true },
  });
}
