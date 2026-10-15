import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth, requireRole, type AuthenticatedRequest } from "@/middleware/auth.middleware";
import { prisma } from "@/config/prisma";
import { hashPassword } from "@/utils/password";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";
import { asyncHandler } from "@/utils/async-handler";

const router = Router();
const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTIONIST"]),
  specialty: z.string().trim().max(80).optional(),
});

router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/staff",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "DOCTOR", "RECEPTIONIST"] } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        specialty: true,
        createdAt: true,
        patient: { select: { matricNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      users: users.map(({ patient, ...user }) => ({
        ...user,
        matricNumber: patient?.matricNumber ?? undefined,
      })),
    });
  }),
);

router.post(
  "/staff",
  asyncHandler(async (req, res) => {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) throw new ConflictError("An account with that email already exists.");
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        role: parsed.data.role as Role,
        passwordHash: await hashPassword(parsed.data.password),
        specialty: parsed.data.role === "DOCTOR" ? parsed.data.specialty : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        specialty: true,
        createdAt: true,
      },
    });
    res.status(201).json({ user });
  }),
);

router.delete(
  "/staff/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new ForbiddenError();
    if (req.params.id === req.user.id)
      throw new ValidationError("You cannot deactivate your own account.");
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || !user.isActive || !["ADMIN", "DOCTOR", "RECEPTIONIST"].includes(user.role)) {
      throw new NotFoundError("Staff account");
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { isActive: false } }),
      prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } }),
    ]);
    res.status(204).send();
  }),
);

export const adminRouter = router;
