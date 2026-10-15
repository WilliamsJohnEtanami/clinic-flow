/**
 * Seeds baseline accounts for local development.
 * Run with: npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
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
      email: "patient@vitaflow.edu",
      fullName: "Marcus Holloway",
      role: "PATIENT" as const,
      password: "patient123",
      matricNumber: "CSC/2021/044",
    },
  ];

  for (const seedUser of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: seedUser.email } });
    if (existing) continue;

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
