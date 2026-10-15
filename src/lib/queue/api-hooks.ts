/**
 * TanStack Query hooks for queue operations against the real backend.
 * These hooks handle list, create, update, and all queue mutations.
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/api-hooks";
import type { QueueEntry } from "./types";

const QUEUE_LIST_KEY = ["queue", "list"];
const QUEUE_ENTRY_KEY = (id: string) => ["queue", "entry", id];

/**
 * useQueueList — GET /queue
 * Fetch the full ordered queue
 */
export function useQueueList(enabled = true) {
  const token = getAccessToken();

  return useQuery({
    queryKey: QUEUE_LIST_KEY,
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.list(token);
      return result.queue;
    },
    enabled: enabled && !!token,
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: 2,
  });
}

/**
 * useQueueEntry — GET /queue/:id
 * Fetch a specific queue entry
 */
export function useQueueEntry(entryId: string | null) {
  const token = getAccessToken();

  return useQuery({
    queryKey: entryId ? QUEUE_ENTRY_KEY(entryId) : ["queue", "entry", "none"],
    queryFn: async () => {
      if (!token || !entryId) throw new Error("Not authenticated or missing entryId");
      const result = await api.queue.getById(token, entryId);
      return result.entry;
    },
    enabled: !!token && !!entryId,
    staleTime: 5000,
    retry: 2,
  });
}

/**
 * useCreateWalkIn — POST /queue/walk-in
 */
export function useCreateWalkIn() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: {
      patientId?: string;
      patientName?: string;
      matricNumber?: string;
      phone?: string;
      reason: string;
      priority?: "ROUTINE" | "EMERGENCY";
      notes?: string;
    }) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.createWalkIn(token, payload);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useCreateFromAppointment — POST /queue/from-appointment
 */
export function useCreateFromAppointment() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.createFromAppointment(token, appointmentId);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: ["appointments", "list"] });
    },
  });
}

/**
 * useCallNext — POST /queue/call-next
 */
export function useCallNext() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.callNext(token);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useStartConsultation — POST /queue/:id/start-consultation
 */
export function useStartConsultation() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: { entryId: string; room?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.startConsultation(token, payload.entryId, payload.room);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useCompleteConsultation — POST /queue/:id/complete-consultation
 */
export function useCompleteConsultation() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: { entryId: string; diagnosis?: string; notes?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.completeConsultation(token, payload.entryId, {
        diagnosis: payload.diagnosis,
        notes: payload.notes,
      });
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useCancelQueueEntry — POST /queue/:id/cancel
 */
export function useCancelQueueEntry() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (payload: { entryId: string; reason?: string }) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.cancel(token, payload.entryId, payload.reason);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useSkipQueueEntry — POST /queue/:id/skip
 */
export function useSkipQueueEntry() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.skip(token, entryId);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useNoShowQueueEntry — POST /queue/:id/no-show
 */
export function useNoShowQueueEntry() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.noShow(token, entryId);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * useTogglePriority — POST /queue/:id/toggle-priority
 */
export function useTogglePriority() {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.queue.togglePriority(token, entryId);
      return result.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
    },
  });
}

/**
 * Utility: Invalidate queue cache (called by Socket.IO listener)
 */
export function invalidateQueueCache(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: QUEUE_LIST_KEY });
}
