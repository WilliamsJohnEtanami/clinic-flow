import { z } from "zod";

export const createPatientSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  matricNumber: z.string().min(1, "Matric number required"),
  fullName: z.string().min(1, "Full name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export const updatePatientSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
