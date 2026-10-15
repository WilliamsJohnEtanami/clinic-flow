import { Router } from "express";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { AppointmentService } from "@/services/appointment.service";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
} from "@/validation/appointment.schema";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";
import { asyncHandler } from "@/utils/async-handler";
import { AppointmentStatus } from "@prisma/client";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw new ForbiddenError();
    const { doctorId, patientId, status, dateFrom, dateTo, limit, offset } = req.query;
    const filters = {
      doctorId: typeof doctorId === "string" ? doctorId : undefined,
      patientId: typeof patientId === "string" ? patientId : undefined,
      status: Object.values(AppointmentStatus).includes(status as AppointmentStatus)
        ? (status as AppointmentStatus)
        : undefined,
      dateFrom: typeof dateFrom === "string" ? new Date(dateFrom) : undefined,
      dateTo: typeof dateTo === "string" ? new Date(dateTo) : undefined,
      limit: limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 100,
      offset: offset ? Math.max(0, parseInt(String(offset), 10) || 0) : 0,
    };
    if (req.user.role === "DOCTOR") filters.doctorId = req.user.id;
    if (req.user.role === "PATIENT") {
      const patient = await AppointmentService.getPatientForUser(req.user.id);
      filters.patientId = patient?.id ?? "__no_patient__";
    }
    res.json(await AppointmentService.listAppointments(filters));
  }),
);

router.get(
  "/patient/:patientId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === "PATIENT") {
      const patient = await AppointmentService.getPatientForUser(req.user.id);
      if (patient?.id !== req.params.patientId) throw new ForbiddenError();
    } else if (!["ADMIN", "RECEPTIONIST"].includes(req.user?.role ?? "")) {
      throw new ForbiddenError();
    }
    const { status, limit, offset } = req.query;
    res.json(
      await AppointmentService.listByPatient(req.params.patientId, {
        status: Object.values(AppointmentStatus).includes(status as AppointmentStatus)
          ? (status as AppointmentStatus)
          : undefined,
        limit: limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20,
        offset: offset ? Math.max(0, parseInt(String(offset), 10) || 0) : 0,
      }),
    );
  }),
);

router.get(
  "/doctor/:doctorId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === "DOCTOR" && req.user.id !== req.params.doctorId) {
      throw new ForbiddenError();
    }
    if (!["ADMIN", "RECEPTIONIST", "DOCTOR"].includes(req.user?.role ?? "")) {
      throw new ForbiddenError();
    }
    const { status, dateFrom, dateTo, limit, offset } = req.query;
    res.json(
      await AppointmentService.listByDoctor(req.params.doctorId, {
        status: Object.values(AppointmentStatus).includes(status as AppointmentStatus)
          ? (status as AppointmentStatus)
          : undefined,
        dateFrom: typeof dateFrom === "string" ? new Date(dateFrom) : undefined,
        dateTo: typeof dateTo === "string" ? new Date(dateTo) : undefined,
        limit: limit ? Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20)) : 20,
        offset: offset ? Math.max(0, parseInt(String(offset), 10) || 0) : 0,
      }),
    );
  }),
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const appointment = await AppointmentService.getAppointmentById(req.params.id);
    if (!appointment) throw new NotFoundError("Appointment");
    if (
      (req.user?.role === "PATIENT" && appointment.patient.userId !== req.user.id) ||
      (req.user?.role === "DOCTOR" && appointment.doctorId !== req.user.id)
    ) {
      throw new ForbiddenError();
    }
    res.json(appointment);
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "RECEPTIONIST", "PATIENT"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    if (!req.user) throw new ForbiddenError();
    const appointment = await AppointmentService.createAppointment({
      ...parsed.data,
      patientId: req.user.role === "PATIENT" ? undefined : parsed.data.patientId,
      createdById: req.user.id,
      patientUserId: req.user.role === "PATIENT" ? req.user.id : undefined,
    });
    res.status(201).json(appointment);
  }),
);

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = updateAppointmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    const existing = await AppointmentService.getAppointmentById(req.params.id);
    if (!existing) throw new NotFoundError("Appointment");
    if (
      (req.user?.role === "PATIENT" && existing.patient.userId !== req.user.id) ||
      (req.user?.role === "DOCTOR" && existing.doctorId !== req.user.id)
    ) {
      throw new ForbiddenError();
    }
    res.json(await AppointmentService.updateAppointment(req.params.id, parsed.data));
  }),
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("DOCTOR", "RECEPTIONIST", "ADMIN"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = typeof req.body.status === "string" ? req.body.status.toUpperCase() : "";
    if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      throw new ValidationError("Invalid or missing status");
    }
    const existing = await AppointmentService.getAppointmentById(req.params.id);
    if (!existing) throw new NotFoundError("Appointment");
    if (req.user?.role === "DOCTOR" && existing.doctorId !== req.user.id) {
      throw new ForbiddenError();
    }
    res.json(await AppointmentService.updateStatus(req.params.id, status as AppointmentStatus));
  }),
);

router.post(
  "/:id/cancel",
  requireAuth,
  requireRole("ADMIN", "RECEPTIONIST", "PATIENT"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = cancelAppointmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    const existing = await AppointmentService.getAppointmentById(req.params.id);
    if (!existing) throw new NotFoundError("Appointment");
    if (req.user?.role === "PATIENT" && existing.patient.userId !== req.user.id) {
      throw new ForbiddenError();
    }
    res.json(await AppointmentService.cancelAppointment(req.params.id, parsed.data));
  }),
);

export const appointmentRouter = router;
