/**
 * Appointment domain types. Represents a pre-scheduled visit.
 * When Lovable Cloud is enabled these map 1:1 to a Supabase `appointments` table.
 */

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  patientName: string;
  patientId?: string;
  matricNumber?: string;
  phone?: string;
  reason: string;
  /** ISO datetime for the appointment slot */
  scheduledFor: string;
  /** Duration in minutes (used to lay out the schedule grid) */
  durationMin: number;
  doctorId?: string;
  doctorName?: string;
  status: AppointmentStatus;
  notes?: string;
  createdBy: string; // user id who booked
  createdAt: string;
  /** Populated when the appointment was promoted into the live queue */
  queueEntryId?: string;
  checkedInAt?: string;
}

export const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};
