import type { Request, Response } from "express";
import * as queueService from "@/queue/queue.service";
import {
  createWalkInSchema,
  createFromAppointmentSchema,
  startConsultationSchema,
  completeConsultationSchema,
} from "@/validation/queue.schema";
import { asyncHandler } from "@/utils/async-handler";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/utils/errors";
import { prisma } from "@/config/prisma";

async function assertDoctorOwnsEntry(req: AuthenticatedRequest, entryId: string) {
  if (req.user?.role !== "DOCTOR") return;
  const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new NotFoundError("Queue entry");
  if (entry.doctorId !== req.user.id) throw new ForbiddenError();
}

export const listQueueHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const queue =
    req.user.role === "PATIENT"
      ? await queueService.listPatientQueue(req.user.id)
      : await queueService.listFullQueue();
  res.json({ queue });
});

export const getQueueEntryHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const entry = await prisma.queueEntry.findUnique({
      where: { id: req.params.id },
      include: { patient: true, doctor: true },
    });
    if (!entry) {
      res.status(404).json({ error: { message: "Queue entry not found" } });
      return;
    }
    if (req.user.role === "PATIENT" && entry.patient.userId !== req.user.id) {
      res.status(403).json({ error: { message: "You may only view your own queue entries" } });
      return;
    }
    res.json({ entry });
  },
);

export const publicQueueHandler = asyncHandler(async (_req: Request, res: Response) => {
  const queue = (await queueService.listOrderedQueue()).map((entry) => ({
    id: entry.id,
    token: entry.token,
    priority: entry.priority,
    status: entry.status,
    room: entry.room,
    estimatedWaitMin: entry.estimatedWaitMin,
    registeredAt: entry.registeredAt,
    calledAt: entry.calledAt,
    doctor: entry.doctor ? { fullName: entry.doctor.fullName } : null,
  }));
  res.json({ queue });
});

export const createWalkInHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const input = createWalkInSchema.parse(req.body);
    if (!input.patientId && !input.patientName && req.user.role !== "PATIENT") {
      throw new ValidationError("A patient name is required.");
    }
    const patientFields =
      req.user.role === "PATIENT"
        ? {
            patientId: undefined,
            patientName: undefined,
            matricNumber: undefined,
            phone: undefined,
          }
        : {};
    const entry = await queueService.createWalkInEntry({
      ...input,
      ...patientFields,
      registeredById: req.user.id,
    });
    res.status(201).json({ entry });
  },
);

export const createFromAppointmentHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { appointmentId } = createFromAppointmentSchema.parse(req.body);
    const entry = await queueService.createEntryFromAppointment(appointmentId, req.user.id);
    res.status(201).json({ entry });
  },
);

export const callNextHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const entry = await queueService.callNextPatient(req.user.id);
  res.json({ entry });
});

export const startConsultationHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { room } = startConsultationSchema.parse(req.body);
    await assertDoctorOwnsEntry(req, req.params.id);
    const entry = await queueService.startConsultation(req.params.id, room);
    res.json({ entry });
  },
);

export const completeConsultationHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const input = completeConsultationSchema.parse(req.body);
    await assertDoctorOwnsEntry(req, req.params.id);
    const entry = await queueService.completeConsultation(req.params.id, input);
    res.json({ entry });
  },
);

export const cancelEntryHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  if (req.user.role === "PATIENT") {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: req.params.id },
      include: { patient: true },
    });
    if (!entry || entry.patient.userId !== req.user.id) {
      res
        .status(entry ? 403 : 404)
        .json({ error: { message: "Queue entry not found or not yours" } });
      return;
    }
  }
  const entry = await queueService.cancelEntry(req.params.id);
  res.json({ entry });
});

export const skipEntryHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await assertDoctorOwnsEntry(req, req.params.id);
  const entry = await queueService.skipEntry(req.params.id);
  res.json({ entry });
});

export const noShowHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await assertDoctorOwnsEntry(req, req.params.id);
  const entry = await queueService.markNoShow(req.params.id);
  res.json({ entry });
});

export const togglePriorityHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const entry = await queueService.togglePriority(req.params.id);
    res.json({ entry });
  },
);

export const exportQueueCsvHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { prisma } = await import("@/config/prisma");

    // Fetch full queue with patient and doctor details
    const entries = await prisma.queueEntry.findMany({
      include: {
        patient: {
          select: { fullName: true, matricNumber: true },
        },
        doctor: {
          select: { fullName: true },
        },
      },
      orderBy: { registeredAt: "asc" },
    });

    // Generate CSV
    const headers = [
      "Token",
      "Patient Name",
      "Matric Number",
      "Priority",
      "Status",
      "Reason",
      "Doctor",
      "Room",
      "Registered At",
      "Called At",
      "Estimated Wait (min)",
    ];
    const rows = entries.map((entry) => [
      entry.token,
      entry.patient.fullName || "",
      entry.patient.matricNumber || "",
      entry.priority.toUpperCase(),
      entry.status.toUpperCase(),
      entry.reason || "",
      entry.doctor?.fullName || "",
      entry.room || "",
      new Date(entry.registeredAt).toISOString(),
      entry.calledAt ? new Date(entry.calledAt).toISOString() : "",
      entry.estimatedWaitMin || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(",") ? `"${escaped}"` : escaped;
          })
          .join(","),
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="queue-export-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  },
);
