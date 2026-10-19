/**
 * Seeds baseline accounts for local development.
 * Run with ALLOW_DEMO_SEED=true npm run prisma:seed.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed accounts must never be created in production.");
  }
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_DEMO_SEED=true to create local demo accounts.");
  }

  const seedUsers = [
    {
      email: "admin@vitaflow.edu",
      fullName: "Dr. Ada Okonkwo",
      role: "ADMIN" as const,
      password: "admin123",
    },
    {
      email: "doctor@vitaflow.edu",
      fullName: "Dr. Emeka Aris",
      role: "DOCTOR" as const,
      password: "doctor123",
      specialty: "General Practice",
    },
    {
      email: "reception@vitaflow.edu",
      fullName: "Nkechi Adebayo",
      role: "RECEPTIONIST" as const,
      password: "reception123",
    },
    {
      email: "patient@example.test",
      fullName: "Demo Patient",
      role: "PATIENT" as const,
      password: "patient123",
      matricNumber: "DEMO/0001",
    },
  ];

  for (const seedUser of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: seedUser.email } });
    if (existing) continue;

    if (seedUser.role === "PATIENT") {
      const existingPatient = await prisma.patient.findUnique({
        where: { matricNumber: seedUser.matricNumber },
        select: { id: true },
      });
      if (existingPatient) continue;
    }

    const passwordHash = await hashPassword(seedUser.password);
    const user = await prisma.user.create({
      data: {
        email: seedUser.email,
        fullName: seedUser.fullName,
        role: seedUser.role,
        passwordHash,
        specialty: "specialty" in seedUser ? seedUser.specialty : undefined,
      },
    });

    if (seedUser.role === "PATIENT") {
      await prisma.patient.create({
        data: {
          userId: user.id,
          fullName: seedUser.fullName,
          email: seedUser.email,
          matricNumber: "matricNumber" in seedUser ? seedUser.matricNumber : undefined,
        },
      });
    }

    console.log(`Seeded ${seedUser.role}: ${seedUser.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
