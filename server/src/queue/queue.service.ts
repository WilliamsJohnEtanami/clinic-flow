import { prisma } from "@/config/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/utils/errors";
import { nextToken } from "./token-counter";
import { rankQueueEntries, selectNextForCall, computeEstimatedWaitMinutes } from "./queue-ordering";
import { broadcastQueueEvent, notifyUser } from "@/realtime/socket";
import { SOCKET_EVENTS } from "@/realtime/events";
import type { Prisma, Priority, QueueEntry } from "@prisma/client";

const DEFAULT_AVG_CONSULT_MIN = 12;
const ROLLING_WINDOW = 20;
type QueueEntryWithRelations = Prisma.QueueEntryGetPayload<{
  include: { patient: true; doctor: true };
}>;

// ---------------------------------------------------------------------------
// Rolling average consultation duration (feeds the EWT engine)
// ---------------------------------------------------------------------------

export async function getRollingAverageConsultMinutes(): Promise<number> {
  const recent = await prisma.consultation.findMany({
    orderBy: { completedAt: "desc" },
    take: ROLLING_WINDOW,
    select: { durationMin: true },
  });
  if (recent.length === 0) return DEFAULT_AVG_CONSULT_MIN;
  const sum = recent.reduce((acc, c) => acc + c.durationMin, 0);
  return Math.round(sum / recent.length);
}

// ---------------------------------------------------------------------------
// Ordered queue read + EWT recalculation
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = ["WAITING", "CALLED", "IN_CONSULTATION"] as const;

export async function listOrderedQueue(): Promise<QueueEntryWithRelations[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: { in: [...ACTIVE_STATUSES] } },
    include: { patient: true, doctor: true },
  });
  return rankQueueEntries(entries);
}

export async function listFullQueue(): Promise<QueueEntryWithRelations[]> {
  const entries = await prisma.queueEntry.findMany({
    include: { patient: true, doctor: true },
  });
  return rankQueueEntries(entries);
}

export async function listPatientQueue(userId: string): Promise<QueueEntryWithRelations[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { patient: { userId } },
    include: { patient: true, doctor: true },
  });
  return rankQueueEntries(entries);
}

/** Recomputes and persists EWT for every WAITING entry; broadcasts the refreshed queue. */
export async function recalculateEwt(): Promise<void> {
  const avgConsultMin = await getRollingAverageConsultMinutes();
  const active = await prisma.queueEntry.findMany({
    where: { status: { in: [...ACTIVE_STATUSES] } },
  });

  const ewtMap = computeEstimatedWaitMinutes(
    active.map((e) => ({
      id: e.id,
      status: e.status,
      priority: e.priority,
      registeredAt: e.registeredAt,
      calledAt: e.calledAt,
      consultationStartAt: e.consultationStartAt,
    })),
    avgConsultMin,
  );

  await Promise.all(
    Array.from(ewtMap.entries()).map(([id, min]) =>
      prisma.queueEntry.update({ where: { id }, data: { estimatedWaitMin: min } }),
    ),
  );
}

async function broadcastQueueRefresh(event: keyof typeof SOCKET_EVENTS, entry?: unknown) {
  await recalculateEwt();
  const queue = await listOrderedQueue();
  broadcastQueueEvent(SOCKET_EVENTS[event], { entry, queue });
}

// ---------------------------------------------------------------------------
// Walk-in / appointment-based registration
// ---------------------------------------------------------------------------

export interface CreateWalkInInput {
  patientId?: string;
  patientName?: string;
  matricNumber?: string;
  phone?: string;
  reason: string;
  priority: Priority;
  notes?: string;
  registeredById: string;
}

export async function createWalkInEntry(input: CreateWalkInInput): Promise<QueueEntry> {
  let patientId = input.patientId;
  if (!patientId) {
    const existingForUser = await prisma.patient.findFirst({
      where: { userId: input.registeredById },
    });
    if (existingForUser) patientId = existingForUser.id;
  }
  if (!patientId) {
    const user = input.patientName
      ? null
      : await prisma.user.findUnique({ where: { id: input.registeredById } });
    if (!input.patientName && !user) throw new NotFoundError("Patient");
    const patient = await prisma.patient.create({
      data: {
        userId: input.patientName ? undefined : input.registeredById,
        fullName: input.patientName ?? user!.fullName,
        matricNumber: input.matricNumber || undefined,
        phone: input.phone || undefined,
      },
    });
    patientId = patient.id;
  } else if (!(await prisma.patient.findUnique({ where: { id: patientId } }))) {
    throw new NotFoundError("Patient");
  }

  const token = await nextToken(input.priority);

  const entry = await prisma.queueEntry.create({
    data: {
      token,
      patientId,
      queueType: "WALK_IN",
      priority: input.priority,
      reason: input.reason,
      notes: input.notes,
      registeredById: input.registeredById,
    },
  });

  await broadcastQueueRefresh(
    input.priority === "EMERGENCY" ? "EMERGENCY_ADDED" : "QUEUE_ENTRY_CREATED",
    entry,
  );
  return entry;
}

export async function createEntryFromAppointment(
  appointmentId: string,
  registeredById: string,
): Promise<QueueEntry> {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new NotFoundError("Appointment");
  if (appointment.status !== "SCHEDULED") {
    throw new ConflictError("Appointment is not in a scheduled state.");
  }

  const token = await nextToken("ROUTINE");

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.queueEntry.create({
      data: {
        token,
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        queueType: "APPOINTMENT",
        priority: "ROUTINE",
        reason: appointment.reason,
        doctorId: appointment.doctorId,
        registeredById,
      },
    });
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: "CHECKED_IN", checkedInAt: new Date() },
    });
    return created;
  });

  await broadcastQueueRefresh("QUEUE_ENTRY_CREATED", entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Doctor workflow: call next → start consultation → complete consultation
// ---------------------------------------------------------------------------

export async function callNextPatient(doctorId: string): Promise<QueueEntry> {
  const doctorBusy = await prisma.queueEntry.findFirst({
    where: { doctorId, status: { in: ["CALLED", "IN_CONSULTATION"] } },
  });
  if (doctorBusy) {
    throw new ConflictError(
      "This doctor already has an active patient. Complete or skip it first.",
    );
  }

  const waiting = await prisma.queueEntry.findMany({ where: { status: "WAITING" } });
  const next = selectNextForCall(
    waiting.map((e) => ({
      id: e.id,
      status: e.status,
      priority: e.priority,
      registeredAt: e.registeredAt,
    })),
  );
  if (!next) throw new NotFoundError("No waiting patients in queue");

  const entry = await prisma.queueEntry.update({
    where: { id: next.id },
    data: { status: "CALLED", calledAt: new Date(), doctorId },
  });

  await broadcastQueueRefresh("PATIENT_CALLED", entry);
  const patient = await prisma.patient.findUnique({ where: { id: entry.patientId } });
  if (patient?.userId) notifyUser(patient.userId, SOCKET_EVENTS.PATIENT_CALLED, entry);
  return entry;
}

export async function startConsultation(queueEntryId: string, room?: string): Promise<QueueEntry> {
  const existing = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!existing) throw new NotFoundError("Queue entry");
  if (existing.status !== "CALLED") {
    throw new ConflictError("Patient must be called before starting a consultation.");
  }

  const entry = await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "IN_CONSULTATION", consultationStartAt: new Date(), room },
  });

  await broadcastQueueRefresh("CONSULTATION_STARTED", entry);
  return entry;
}

export interface CompleteConsultationInput {
  diagnosis?: string;
  notes?: string;
  vitals?: Record<string, unknown>;
}

export async function completeConsultation(
  queueEntryId: string,
  input: CompleteConsultationInput,
): Promise<QueueEntry> {
  const existing = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!existing) throw new NotFoundError("Queue entry");
  if (
    existing.status !== "IN_CONSULTATION" ||
    !existing.consultationStartAt ||
    !existing.doctorId
  ) {
    throw new ConflictError("Consultation must be in progress to complete it.");
  }

  const now = new Date();
  const durationMin = Math.max(
    1,
    Math.round((now.getTime() - existing.consultationStartAt.getTime()) / 60_000),
  );
  const actualWaitMin = existing.calledAt
    ? Math.round((existing.calledAt.getTime() - existing.registeredAt.getTime()) / 60_000)
    : null;

  const entry = await prisma.$transaction(async (tx) => {
    const updated = await tx.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status: "COMPLETED",
        consultationEndAt: now,
        actualWaitMin: actualWaitMin ?? undefined,
      },
    });
    await tx.consultation.create({
      data: {
        queueEntryId,
        patientId: existing.patientId,
        doctorId: existing.doctorId!,
        startedAt: existing.consultationStartAt!,
        completedAt: now,
        durationMin,
        diagnosis: input.diagnosis,
        notes: input.notes,
        vitals: input.vitals as never,
      },
    });
    if (existing.appointmentId) {
      await tx.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: "COMPLETED" },
      });
    }
    return updated;
  });

  await broadcastQueueRefresh("CONSULTATION_COMPLETED", entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Cancellation / skip / no-show / priority override
// ---------------------------------------------------------------------------

export async function cancelEntry(queueEntryId: string): Promise<QueueEntry> {
  const existing = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!existing) throw new NotFoundError("Queue entry");
  if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(existing.status)) {
    throw new ConflictError("Cannot cancel an entry that is already resolved.");
  }

  const entry = await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "CANCELLED" },
  });

  await broadcastQueueRefresh("PATIENT_CANCELLED", entry);
  return entry;
}

export async function skipEntry(queueEntryId: string): Promise<QueueEntry> {
  const existing = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!existing) throw new NotFoundError("Queue entry");
  if (existing.status !== "CALLED") {
    throw new ConflictError("Only a called patient can be skipped.");
  }

  const entry = await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "SKIPPED" },
  });

  await broadcastQueueRefresh("PATIENT_SKIPPED", entry);
  return entry;
}

export async function markNoShow(queueEntryId: string): Promise<QueueEntry> {
  const existing = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!existing) throw new NotFoundError("Queue entry");
  if (existing.status !== "CALLED") {
    throw new ConflictError("Only a called patient can be marked no-show.");
  }

  const entry = await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "NO_SHOW" },
  });

  await broadcastQueueRefresh("QUEUE_UPDATED", entry);
  return entry;
}

export async function togglePriority(queueEntryId: string): Promise<QueueEntry> {
  const existing = await prisma.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!existing) throw new NotFoundError("Queue entry");
  if (existing.status !== "WAITING") {
    throw new ValidationError("Priority can only be changed while a patient is waiting.");
  }

  const newPriority: Priority = existing.priority === "EMERGENCY" ? "ROUTINE" : "EMERGENCY";
  const entry = await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: { priority: newPriority },
  });

  await broadcastQueueRefresh(
    newPriority === "EMERGENCY" ? "EMERGENCY_ADDED" : "QUEUE_UPDATED",
    entry,
  );
  return entry;
}
