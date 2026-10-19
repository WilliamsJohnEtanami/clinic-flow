import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Single shared Prisma instance across the app (and hot-reload safe in dev).
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasourceUrl: env.directDatabaseUrl,
    log: env.isProduction ? ["error", "warn"] : ["error", "warn", "query"],
  });

if (!env.isProduction) global.__prisma = prisma;
