/**
 * TanStack Query hooks for authentication against the real backend.
 * These hooks handle login, registration, token refresh, and logout.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import type { Credentials, RegisterPayload, Session, User } from "./types";
import { getStoredSession } from "./store";

const AUTH_QUERY_KEY = ["auth", "session"];
const ACCESS_TOKEN_KEY = "vitaflow.accessToken";
const REFRESH_TOKEN_KEY = "vitaflow.refreshToken";

/**
 * Store tokens in localStorage (can be replaced with secure storage later)
 */
export function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Retrieve tokens from localStorage
 */
export function getStoredTokens() {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Clear tokens from localStorage
 */
export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Construct a Session from API response
 */
function sessionFromApiResponse(
  user: { id: string; email: string; fullName: string; role: string },
  accessToken: string,
): Session {
  return {
    user: user as User,
    token: accessToken,
    issuedAt: new Date().toISOString(),
  };
}

/**
 * useLogin — POST /auth/login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creds: Credentials) => {
      const response = await api.auth.login(creds.email, creds.password);
      storeTokens(response.accessToken, response.refreshToken);
      return sessionFromApiResponse(response.user, response.accessToken);
    },
    onSuccess: (session) => {
      // Set the cached session for future queries
      queryClient.setQueryData(AUTH_QUERY_KEY, session);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        throw new Error(
          typeof error.details === "object" && error.details && "message" in error.details
            ? String((error.details as Record<string, unknown>).message || error.message)
            : error.message,
        );
      }
      throw error;
    },
  });
}

/**
 * useRegister — POST /auth/register
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await api.auth.register({
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
        role: "PATIENT",
        matricNumber: payload.matricNumber,
      });
      storeTokens(response.accessToken, response.refreshToken);
      return sessionFromApiResponse(response.user, response.accessToken);
    },
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session);
    },
  });
}

/**
 * useLogout — POST /auth/logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      await api.auth.logout(token);
      clearTokens();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
      clearTokens();
    },
  });
}

/**
 * useRefreshToken — POST /auth/refresh
 * Called internally to refresh the access token using the refresh token
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      const tokens = getStoredTokens();
      if (!tokens) throw new Error("No refresh token available");

      const response = await api.auth.refresh(tokens.refreshToken);
      // Note: the response includes a new accessToken, but not a new refreshToken
      // (the backend returns only accessToken in the refresh response)
      // Store the new accessToken
      storeTokens(response.accessToken, tokens.refreshToken);
      return response.accessToken;
    },
  });
}

/**
 * useAuthSession — Get the current auth session
 * Returns the session from cache or null if not logged in
 * Does NOT make a network request — purely reads localStorage
 */
export function useAuthSession() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const tokens = getStoredTokens();
      if (!tokens) return null;
      return getStoredSession();
    },
    staleTime: Infinity, // Never auto-refetch
    retry: false,
  });
}

/**
 * Utility to get the current access token
 */
export function getAccessToken(): string | null {
  const tokens = getStoredTokens();
  return tokens?.accessToken || null;
}

export function getRefreshToken(): string | null {
  return getStoredTokens()?.refreshToken ?? null;
}
