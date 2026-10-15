import { Router } from "express";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  listQueueHandler,
  createWalkInHandler,
  createFromAppointmentHandler,
  callNextHandler,
  startConsultationHandler,
  completeConsultationHandler,
  cancelEntryHandler,
  skipEntryHandler,
  noShowHandler,
  togglePriorityHandler,
  exportQueueCsvHandler,
  publicQueueHandler,
  getQueueEntryHandler,
} from "@/controllers/queue.controller";

export const queueRouter = Router();

queueRouter.get("/display", publicQueueHandler);
queueRouter.get("/", requireAuth, listQueueHandler);
queueRouter.get("/:id", requireAuth, getQueueEntryHandler);
queueRouter.get(
  "/export/csv",
  requireAuth,
  requireRole("ADMIN", "RECEPTIONIST"),
  exportQueueCsvHandler,
);

queueRouter.post(
  "/walk-in",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN", "PATIENT"),
  createWalkInHandler,
);
queueRouter.post(
  "/from-appointment",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN"),
  createFromAppointmentHandler,
);

queueRouter.post("/call-next", requireAuth, requireRole("DOCTOR"), callNextHandler);
queueRouter.post("/:id/start", requireAuth, requireRole("DOCTOR"), startConsultationHandler);
queueRouter.post("/:id/complete", requireAuth, requireRole("DOCTOR"), completeConsultationHandler);
queueRouter.post("/:id/skip", requireAuth, requireRole("DOCTOR", "RECEPTIONIST"), skipEntryHandler);
queueRouter.post("/:id/no-show", requireAuth, requireRole("DOCTOR", "RECEPTIONIST"), noShowHandler);
queueRouter.post(
  "/:id/cancel",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN", "PATIENT"),
  cancelEntryHandler,
);
queueRouter.post(
  "/:id/toggle-priority",
  requireAuth,
  requireRole("RECEPTIONIST", "ADMIN"),
  togglePriorityHandler,
);
