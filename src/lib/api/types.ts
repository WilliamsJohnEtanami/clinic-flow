/**
 * API response types for VitaFlow backend
 * These types define all responses from /api endpoints
 */

import type { User as AuthUser, Session, Role } from "@/lib/auth/types";
import type { Appointment, AppointmentStatus } from "@/lib/appointments/types";
import type {
  QueueEntry,
  QueueStatus,
  Priority,
  Patient,
  User as QueueUser,
} from "@/lib/queue/types";

// ─────────────────────────────────────────────────────────────────────────
// Auth Responses
// ─────────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Patient Responses
// ─────────────────────────────────────────────────────────────────────────

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  limit: number;
  offset: number;
}

export interface PatientResponse extends Patient {
  userId?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Appointment Responses
// ─────────────────────────────────────────────────────────────────────────

export interface AppointmentListResponse {
  appointments: AppointmentResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface AppointmentResponse {
  id: string;
  patientId: string;
  doctorId: string | null;
  reason: string;
  scheduledFor: string;
  durationMin: number;
  status: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt: string | null;
  patient?: { fullName: string; matricNumber: string | null; phone: string | null };
  doctor?: { fullName: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Queue Responses
// ─────────────────────────────────────────────────────────────────────────

export interface QueueListResponse {
  queue: QueueEntry[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface QueueEntryResponse extends QueueEntry {
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Notification Responses
// ─────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type:
    | "YOU_ARE_NEXT"
    | "DOCTOR_CALLING"
    | "EMERGENCY_IN_QUEUE"
    | "APPOINTMENT_REMINDER"
    | "QUEUE_UPDATED"
    | "GENERAL";
  title: string;
  message: string;
  read: boolean;
  queueEntryId?: string;
  appointmentId?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Common Responses
// ─────────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorResponse {
  error: string;
  statusCode: number;
  details?: unknown;
}
