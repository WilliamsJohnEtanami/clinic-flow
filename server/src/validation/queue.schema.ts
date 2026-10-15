import { z } from "zod";

export const createWalkInSchema = z.object({
  patientId: z.string().uuid().optional(),
  patientName: z.string().trim().min(2).optional(),
  matricNumber: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  reason: z.string().min(3),
  priority: z.enum(["EMERGENCY", "ROUTINE"]).default("ROUTINE"),
  notes: z.string().optional(),
});
export type CreateWalkInInput = z.infer<typeof createWalkInSchema>;

export const createFromAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const startConsultationSchema = z.object({
  room: z.string().optional(),
});

export const completeConsultationSchema = z.object({
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  vitals: z.record(z.string(), z.unknown()).optional(),
});
