/**
 * API client for the VitaFlow backend.
 * Handles auth header injection, error handling, and response parsing.
 */

import type {
  AuthResponse,
  RefreshResponse,
  PatientListResponse,
  PatientResponse,
  AppointmentListResponse,
  AppointmentResponse,
  QueueListResponse,
  QueueEntryResponse,
  NotificationListResponse,
  Notification,
} from "./types";

const API_BASE = (
  import.meta.env.DEV ? import.meta.env.VITE_API_URL || "http://localhost:4000/api" : "/api"
).replace(/\/$/, "");

function getApiBase(): string {
  return API_BASE;
}

export function getRealtimeUrl(): string {
  if (typeof window === "undefined") {
    throw new Error("The realtime URL can only be resolved in the browser.");
  }
  return window.location.origin;
}

function queryString(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public details?: unknown,
    message = "API error",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options;

  const headers = new Headers(init.headers as HeadersInit);
  headers.set("Content-Type", "application/json");

  const url = `${getApiBase()}${endpoint}`;

  try {
    const send = (authToken?: string) => {
      const requestHeaders = new Headers(headers);
      if (authToken) requestHeaders.set("Authorization", `Bearer ${authToken}`);
      return fetch(url, { ...init, headers: requestHeaders });
    };
    let response = await send(token);

    if (response.status === 401 && token && endpoint !== "/auth/refresh") {
      const refreshed = await refreshStoredSession();
      if (refreshed) response = await send(refreshed.accessToken);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message =
        typeof errorData === "object" &&
        errorData !== null &&
        "error" in errorData &&
        typeof errorData.error === "object" &&
        errorData.error !== null &&
        "message" in errorData.error &&
        typeof errorData.error.message === "string"
          ? errorData.error.message
          : `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(response.status, errorData, message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, error, "Network error or invalid response");
  }
}

let refreshPromise: Promise<RefreshResponse | null> | null = null;

async function refreshStoredSession(): Promise<RefreshResponse | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("vitaflow.refreshToken");
  if (!refreshToken) {
    localStorage.removeItem("vitaflow.accessToken");
    window.dispatchEvent(new Event("vitaflow:session-expired"));
    return null;
  }
  if (!refreshPromise) {
    refreshPromise = fetch(`${getApiBase()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status !== 401 && response.status !== 403) {
            throw new ApiError(
              response.status,
              undefined,
              `Token refresh failed: HTTP ${response.status}: ${response.statusText}`,
            );
          }
          localStorage.removeItem("vitaflow.accessToken");
          localStorage.removeItem("vitaflow.refreshToken");
          window.dispatchEvent(new Event("vitaflow:session-expired"));
          return null;
        }
        const tokens = (await response.json()) as RefreshResponse;
        localStorage.setItem("vitaflow.accessToken", tokens.accessToken);
        localStorage.setItem("vitaflow.refreshToken", tokens.refreshToken);
        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export const api = {
  /**
   * POST /auth/register
   */
  auth: {
    register: async (payload: {
      email: string;
      password: string;
      fullName: string;
      role: "PATIENT";
      matricNumber: string;
    }) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /**
     * POST /auth/login
     */
    login: async (email: string, password: string) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    requestPasswordReset: async (email: string) =>
      request<{ message: string }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: async (token: string, password: string) =>
      request<void>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),

    /**
     * POST /auth/refresh
     */
    refresh: async (refreshToken: string) =>
      request<RefreshResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    /**
     * POST /auth/logout
     */
    logout: async (refreshToken: string) =>
      request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
  },

  /**
   * Patient endpoints
   */
  patients: {
    list: async (token: string, params?: { search?: string; limit?: number; offset?: number }) =>
      request<PatientListResponse>(
        `/patients${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        {
          token,
        },
      ),

    getById: async (token: string, id: string) =>
      request<PatientResponse>(`/patients/${id}`, { token }),

    getByMatricNumber: async (token: string, matricNumber: string) =>
      request<PatientResponse>(`/patients/matric/${matricNumber}`, { token }),

    create: async (
      token: string,
      payload: {
        userId: string;
        matricNumber: string;
        fullName: string;
        phone?: string;
        email?: string;
        dateOfBirth?: string;
        gender?: string;
      },
    ) =>
      request<PatientResponse>("/patients", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),

    update: async (
      token: string,
      id: string,
      payload: {
        fullName?: string;
        phone?: string;
        email?: string;
        dateOfBirth?: string;
        gender?: string;
      },
    ) =>
      request<PatientResponse>(`/patients/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),

    delete: async (token: string, id: string) =>
      request<void>(`/patients/${id}`, {
        method: "DELETE",
        token,
      }),
  },

  /**
   * Appointment endpoints
   */
  appointments: {
    list: async (
      token: string,
      params?: {
        doctorId?: string;
        patientId?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
      },
    ) =>
      request<AppointmentListResponse>(
        `/appointments${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        {
          token,
        },
      ),

    getById: async (token: string, id: string) =>
      request<AppointmentResponse>(`/appointments/${id}`, { token }),

    listByPatient: async (
      token: string,
      patientId: string,
      params?: { status?: string; limit?: number; offset?: number },
    ) =>
      request<AppointmentListResponse>(
        `/appointments/patient/${patientId}${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        { token },
      ),

    listByDoctor: async (
      token: string,
      doctorId: string,
      params?: {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
      },
    ) =>
      request<AppointmentListResponse>(
        `/appointments/doctor/${doctorId}${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        { token },
      ),

    create: async (
      token: string,
      payload: {
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
      },
    ) =>
      request<AppointmentResponse>("/appointments", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),

    update: async (
      token: string,
      id: string,
      payload: {
        reason?: string;
        scheduledFor?: string;
        durationMin?: number;
        notes?: string;
      },
    ) =>
      request<AppointmentResponse>(`/appointments/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),

    updateStatus: async (token: string, id: string, status: string) =>
      request<AppointmentResponse>(`/appointments/${id}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      }),

    cancel: async (token: string, id: string, reason?: string) =>
      request<AppointmentResponse>(`/appointments/${id}/cancel`, {
        method: "POST",
        token,
        body: JSON.stringify({ reason }),
      }),
  },

  /**
   * Queue endpoints
   */
  queue: {
    display: async () =>
      request<{
        queue: Array<{
          id: string;
          token: string;
          priority: "ROUTINE" | "EMERGENCY";
          status: "WAITING" | "CALLED" | "IN_CONSULTATION";
          room: string | null;
          estimatedWaitMin: number | null;
          registeredAt: string;
          calledAt: string | null;
          doctor: { fullName: string } | null;
        }>;
      }>("/queue/display"),
    list: async (token: string, params?: { limit?: number; offset?: number }) =>
      request<QueueListResponse>(
        `/queue${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        {
          token,
        },
      ),

    getById: async (token: string, id: string) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${id}`, { token }),

    createWalkIn: async (
      token: string,
      payload: {
        patientId?: string;
        patientName?: string;
        matricNumber?: string;
        phone?: string;
        reason: string;
        priority?: "ROUTINE" | "EMERGENCY";
        notes?: string;
      },
    ) =>
      request<{ entry: QueueEntryResponse }>("/queue/walk-in", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),

    createFromAppointment: async (token: string, appointmentId: string) =>
      request<{ entry: QueueEntryResponse }>("/queue/from-appointment", {
        method: "POST",
        token,
        body: JSON.stringify({ appointmentId }),
      }),

    callNext: async (token: string) =>
      request<{ entry: QueueEntryResponse }>("/queue/call-next", {
        method: "POST",
        token,
      }),

    startConsultation: async (token: string, entryId: string, room?: string) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${entryId}/start`, {
        method: "POST",
        token,
        body: JSON.stringify({ room }),
      }),

    completeConsultation: async (
      token: string,
      entryId: string,
      details: { diagnosis?: string; notes?: string },
    ) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${entryId}/complete`, {
        method: "POST",
        token,
        body: JSON.stringify(details),
      }),

    cancel: async (token: string, entryId: string, reason?: string) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${entryId}/cancel`, {
        method: "POST",
        token,
        body: JSON.stringify({ reason }),
      }),

    skip: async (token: string, entryId: string) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${entryId}/skip`, {
        method: "POST",
        token,
      }),

    noShow: async (token: string, entryId: string) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${entryId}/no-show`, {
        method: "POST",
        token,
      }),

    togglePriority: async (token: string, entryId: string) =>
      request<{ entry: QueueEntryResponse }>(`/queue/${entryId}/toggle-priority`, {
        method: "POST",
        token,
      }),
  },

  /**
   * Notification endpoints
   */
  notifications: {
    list: async (token: string, params?: { limit?: number; offset?: number }) =>
      request<NotificationListResponse>(
        `/notifications${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        { token },
      ),

    unread: async (token: string, params?: { limit?: number; offset?: number }) =>
      request<NotificationListResponse>(
        `/notifications/unread${params ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : ""}`,
        { token },
      ),

    markAsRead: async (token: string, notificationId: string) =>
      request<{ notification: Notification }>(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        token,
      }),

    markAllAsRead: async (token: string) =>
      request<{ message: string }>("/notifications/read-all", {
        method: "PATCH",
        token,
      }),

    delete: async (token: string, notificationId: string) =>
      request<{ message: string }>(`/notifications/${notificationId}`, {
        method: "DELETE",
        token,
      }),
  },

  admin: {
    listStaff: async (token: string) =>
      request<{
        users: Array<{
          id: string;
          email: string;
          fullName: string;
          role: string;
          specialty: string | null;
          matricNumber?: string;
          createdAt: string;
        }>;
      }>("/admin/staff", { token }),
    createStaff: async (
      token: string,
      payload: {
        fullName: string;
        email: string;
        password: string;
        role: string;
        specialty?: string;
      },
    ) =>
      request<{
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
          specialty: string | null;
          createdAt: string;
        };
      }>("/admin/staff", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),
    deleteStaff: async (token: string, id: string) =>
      request<void>(`/admin/staff/${id}`, { method: "DELETE", token }),
  },
};

export default api;
