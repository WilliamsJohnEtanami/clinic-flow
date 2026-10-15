import { z } from "zod";

export const createAppointmentSchema = z
  .object({
    patientId: z.string().uuid("Invalid patient ID").optional(),
    patientName: z.string().trim().min(2).optional(),
    matricNumber: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional(),
    doctorId: z.string().uuid("Invalid doctor ID").optional(),
    reason: z.string().min(1, "Reason required"),
    scheduledFor: z.string().datetime("Invalid date format"),
    durationMin: z.number().int().positive().default(20),
    notes: z.string().optional(),
  })
  .refine((value) => value.patientId || value.patientName, {
    message: "Provide a patient ID or patient name",
  });

export const updateAppointmentSchema = z.object({
  reason: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  durationMin: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
