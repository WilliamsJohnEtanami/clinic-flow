/**
 * Queue domain types matching Prisma QueueEntry model with nested relations.
 */

export type Priority = "ROUTINE" | "EMERGENCY";

export type QueueStatus =
  "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "SKIPPED" | "NO_SHOW";

export interface Patient {
  id: string;
  userId?: string;
  fullName: string;
  matricNumber: string;
  phone?: string;
  email?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  specialty?: string;
}

export interface QueueEntry {
  id: string;
  token: string;
  patientId: string;
  patient: Patient;
  appointmentId?: string;
  queueType: "WALK_IN" | "APPOINTMENT" | "FROM_APPOINTMENT";
  priority: Priority;
  status: QueueStatus;
  patientName?: string;
  matricNumber?: string;
  phone?: string;
  reason: string;
  notes?: string;
  doctorId?: string;
  doctor?: User;
  room?: string;
  registeredById: string;
  registeredAt: string;
  calledAt?: string;
  consultationStartAt?: string;
  consultationEndAt?: string;
  completedAt?: string;
  estimatedWaitMin?: number;
  actualWaitMin?: number;
  registeredBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  ROUTINE: "Routine",
  EMERGENCY: "Emergency",
};

export const STATUS_LABEL: Record<QueueStatus, string> = {
  WAITING: "Waiting",
  CALLED: "Called",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  SKIPPED: "Skipped",
  NO_SHOW: "No Show",
};
