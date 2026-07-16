/**
 * Queue domain types. When Lovable Cloud is enabled these map 1:1 to
 * Supabase tables (queue_entries, patients).
 */

export type Priority = "routine" | "emergency";

export type QueueStatus =
  | "waiting"
  | "in_consultation"
  | "completed"
  | "cancelled";

export interface QueueEntry {
  id: string;
  /** Human-readable token, e.g. A-014 or E-003 */
  token: string;
  patientName: string;
  matricNumber?: string;
  phone?: string;
  reason: string;
  priority: Priority;
  status: QueueStatus;
  /** Doctor ID once called; undefined while waiting */
  doctorId?: string;
  doctorName?: string;
  room?: string;
  registeredBy: string; // user id of receptionist / patient
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  /** Optional notes captured at registration (vitals, complaint detail) */
  notes?: string;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  routine: "Routine",
  emergency: "Emergency",
};

export const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "Waiting",
  in_consultation: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
};
