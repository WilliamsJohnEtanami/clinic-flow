import { Router, Request, Response } from "express";
import { asyncHandler } from "@/utils/async-handler";
import { AuthenticatedRequest, requireAuth, requireRole } from "@/middleware/auth.middleware";
import { PatientService } from "@/services/patient.service";
import { createPatientSchema, updatePatientSchema } from "@/validation/patient.schema";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

const router = Router();

/**
 * GET /patients
 * List all patients (reception/admin only)
 */
router.get(
  "/",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const { search, limit, offset } = req.query;

    const result = await PatientService.listPatients({
      search: typeof search === "string" ? search : undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json(result);
  }),
);

/**
 * GET /patients/matric/:matricNumber
 * Get patient by matric number (reception/admin/patient own record)
 */
router.get(
  "/matric/:matricNumber",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { matricNumber } = req.params;

    const patient = await PatientService.getPatientByMatricNumber(matricNumber);
    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }
    if (req.user?.role === "PATIENT" && patient.userId !== req.user.id) {
      throw new ForbiddenError();
    }
    if (!["ADMIN", "RECEPTIONIST", "PATIENT"].includes(req.user?.role ?? "")) {
      throw new ForbiddenError();
    }

    res.json(patient);
  }),
);

/**
 * GET /patients/:id
 * Get patient by ID (reception/admin/patient own record)
 */
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const patient = await PatientService.getPatientById(id);
    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }
    if (req.user?.role === "PATIENT" && patient.userId !== req.user.id) {
      throw new ForbiddenError();
    }
    if (!["ADMIN", "RECEPTIONIST", "PATIENT"].includes(req.user?.role ?? "")) {
      throw new ForbiddenError();
    }

    res.json(patient);
  }),
);

/**
 * POST /patients
 * Create a new patient (reception/admin only)
 */
router.post(
  "/",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const patient = await PatientService.createPatient(parsed.data);
    res.status(201).json(patient);
  }),
);

/**
 * PUT /patients/:id
 * Update a patient (reception/admin/patient own record)
 */
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const parsed = updatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }
    const existing = await PatientService.getPatientById(id);
    if (!existing) throw new NotFoundError("Patient");
    if (req.user?.role === "PATIENT" && existing.userId !== req.user.id) {
      throw new ForbiddenError();
    }
    if (!["ADMIN", "RECEPTIONIST", "PATIENT"].includes(req.user?.role ?? "")) {
      throw new ForbiddenError();
    }

    const patient = await PatientService.updatePatient(id, parsed.data);
    res.json(patient);
  }),
);

/**
 * DELETE /patients/:id
 * Delete a patient (admin only)
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await PatientService.deletePatient(id);
    res.status(204).send();
  }),
);

export const patientRouter = router;
