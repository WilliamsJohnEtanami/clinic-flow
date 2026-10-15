import { Prisma } from "@prisma/client";
import { prisma } from "@/config/prisma";
import type { Priority } from "@prisma/client";

/**
 * Atomically generates the next daily token (e.g. A-014 / E-003).
 * Uses a SERIALIZABLE transaction with a short retry loop — acceptable for
 * a single-clinic, low-concurrency environment; revisit with a DB sequence
 * or advisory lock if load testing shows contention.
 */
export async function nextToken(priority: Priority): Promise<string> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `token-counter-${priority.toLowerCase()}-${dateKey}`;
  const prefix = priority === "EMERGENCY" ? "E" : "A";

  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const value = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.clinicSetting.findUnique({ where: { key } });
          const current = existing ? Number(existing.value) : 0;
          const next = current + 1;
          await tx.clinicSetting.upsert({
            where: { key },
            update: { value: next },
            create: { key, value: next, description: "Daily token counter" },
          });
          return next;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return `${prefix}-${String(value).padStart(3, "0")}`;
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      // Serialization conflict — retry.
    }
  }
  throw new Error("Failed to generate token after retries");
}
