/**
 * TanStack Query hooks for appointment operations against the real backend.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/api-hooks";

const APPOINTMENTS_LIST_KEY = ["appointments", "list"];
const APPOINTMENTS_BY_PATIENT_KEY = (patientId: string) => ["appointments", "patient", patientId];
const APPOINTMENTS_BY_DOCTOR_KEY = (doctorId: string) => ["appointments", "doctor", doctorId];
const APPOINTMENT_KEY = (id: string) => ["appointments", "entry", id];

function toAppointment(value: {
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
  checkedInAt: string | null;
  patient?: { fullName: string; matricNumber: string | null; phone: string | null };
  doctor?: { fullName: string } | null;
}) {
  return {
    id: value.id,
    patientId: value.patientId,
    patientName: value.patient?.fullName ?? "",
    matricNumber: value.patient?.matricNumber ?? undefined,
    phone: value.patient?.phone ?? undefined,
    reason: value.reason,
    scheduledFor: value.scheduledFor,
    durationMin: value.durationMin,
    doctorId: value.doctorId ?? undefined,
    doctorName: value.doctor?.fullName ?? undefined,
    status: value.status.toLowerCase() as
      "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show",
    notes: value.notes ?? undefined,
    createdBy: value.createdById,
    createdAt: value.createdAt,
    checkedInAt: value.checkedInAt ?? undefined,
  };
}

/**
 * useAppointmentsList — GET /appointments
 */
export function useAppointmentsList(
  filters?: {
    doctorId?: string;
    patientId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  },
  enabled = true,
) {
  const token = getAccessToken();

  return useQuery({
    queryKey: [...APPOINTMENTS_LIST_KEY, filters],
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.appointments.list(token, filters);
      return result.appointments.map(toAppointment);
    },
    enabled: enabled && !!token,
    staleTime: 10000,
    refetchInterval: 10000,
    retry: 2,
  });
}

/**
 * useAppointmentsByPatient — GET /appointments/patient/:patientId
 */
export function useAppointmentsByPatient(
  patientId: string | null,
  filters?: { status?: string; limit?: number; offset?: number },
  enabled = true,
) {
  const token = getAccessToken();

  return useQuery({
    queryKey: patientId
      ? APPOINTMENTS_BY_PATIENT_KEY(patientId)
      : ["appointments", "patient", "none"],
    queryFn: async () => {
      if (!token || !patientId) throw new Error("Not authenticated or missing patientId");
      const result = await api.appointments.listByPatient(token, patientId, filters);
      return result.appointments.map(toAppointment);
    },
    enabled: enabled && !!token && !!patientId,
    staleTime: 10000,
    retry: 2,
  });
}

/**
 * useAppointmentsByDoctor — GET /appointments/doctor/:doctorId
 */
export function useAppointmentsByDoctor(
  doctorId: string | null,
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  },
  enabled = true,
) {
  const token = getAccessToken();

  return useQuery({
    queryKey: doctorId ? APPOINTMENTS_BY_DOCTOR_KEY(doctorId) : ["appointments", "doctor", "none"],
    queryFn: async () => {
      if (!token || !doctorId) throw new Error("Not authenticated or missing doctorId");
      const result = await api.appointments.listByDoctor(token, doctorId, filters);
      return result.appointments.map(toAppointment);
    },
    enabled: enabled && !!token && !!doctorId,
    staleTime: 10000,
    retry: 2,
  });
}

/**
 * useAppointment — GET /appointments/:id
 */
export function useAppointment(appointmentId: string | null, enabled = true) {
  const token = getAccessToken();

  return useQuery({
    queryKey: appointmentId ? APPOINTMENT_KEY(appointmentId) : ["appointments", "entry", "none"],
    queryFn: async () => {
      if (!token || !appointmentId) throw new Error("Not authenticated or missing appointmentId");
      return toAppointment(await api.appointments.getById(token, appointmentId));
    },
    enabled: enabled && !!token && !!appointmentId,
    staleTime: 10000,
    retry: 2,
  });
}

/**
 * useCreateAppointment — POST /appointments
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: {
      patientId?: string;
      patientName?: string;
      matricNumber?: string;
      phone?: string;
      doctorId?: string;
      reason: string;
      scheduledFor: string;
      durationMin?: number;
      notes?: string;
      createdById?: string;
    }) => {
      if (!token) throw new Error("Not authenticated");
      return toAppointment(await api.appointments.create(token, payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_LIST_KEY });
    },
  });
}

/**
 * useUpdateAppointment — PUT /appointments/:id
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      reason?: string;
      scheduledFor?: string;
      durationMin?: number;
      notes?: string;
    }) => {
      if (!token) throw new Error("Not authenticated");
      const { id, ...data } = payload;
      return toAppointment(await api.appointments.update(token, id, data));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_LIST_KEY });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEY(data.id) });
      }
    },
  });
}

/**
 * useUpdateAppointmentStatus — PATCH /appointments/:id/status
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: { id: string; status: string }) => {
      if (!token) throw new Error("Not authenticated");
      return toAppointment(await api.appointments.updateStatus(token, payload.id, payload.status));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_LIST_KEY });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEY(data.id) });
      }
    },
  });
}

/**
 * useCancelAppointment — POST /appointments/:id/cancel
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: { id: string; reason?: string }) => {
      if (!token) throw new Error("Not authenticated");
      return toAppointment(await api.appointments.cancel(token, payload.id, payload.reason));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_LIST_KEY });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: APPOINTMENT_KEY(data.id) });
      }
    },
  });
}
