/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Credentials, RegisterPayload, Session, User } from "./types";
import { getStoredSession, persistSession } from "./store";
import { clearTokens, getRefreshToken, getAccessToken, storeTokens } from "./api-hooks";
import { api } from "@/lib/api/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: "loading" | "authenticated" | "anonymous";
  signIn: (creds: Credentials) => Promise<Session>;
  signUp: (payload: RegisterPayload) => Promise<Session>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    const existing = getStoredSession();
    if (existing?.token.startsWith("mock.")) {
      persistSession(null);
      clearTokens();
      setStatus("anonymous");
      return;
    }
    setSession(existing);
    setStatus(existing && getAccessToken() ? "authenticated" : "anonymous");

    const handleSessionExpired = () => {
      clearTokens();
      persistSession(null);
      setSession(null);
      setStatus("anonymous");
    };
    window.addEventListener("vitaflow:session-expired", handleSessionExpired);
    return () => window.removeEventListener("vitaflow:session-expired", handleSessionExpired);
  }, []);

  const doSignIn = useCallback(async (creds: Credentials) => {
    const response = await api.auth.login(creds.email, creds.password);
    const user: User = {
      ...response.user,
      role: response.user.role.toLowerCase() as User["role"],
    };
    const s: Session = { user, token: response.accessToken, issuedAt: new Date().toISOString() };
    storeTokens(response.accessToken, response.refreshToken);
    persistSession(s);
    setSession(s);
    setStatus("authenticated");
    return s;
  }, []);

  const doSignUp = useCallback(async (payload: RegisterPayload) => {
    const response = await api.auth.register({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      role: "PATIENT",
      matricNumber: payload.matricNumber,
    });
    const user: User = {
      ...response.user,
      role: response.user.role.toLowerCase() as User["role"],
    };
    const s: Session = { user, token: response.accessToken, issuedAt: new Date().toISOString() };
    storeTokens(response.accessToken, response.refreshToken);
    persistSession(s);
    setSession(s);
    setStatus("authenticated");
    return s;
  }, []);

  const doSignOut = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.auth.logout(refreshToken);
      }
    } catch (error) {
      console.error("Remote sign-out failed; local credentials were cleared.", error);
    } finally {
      clearTokens();
      persistSession(null);
      setSession(null);
      setStatus("anonymous");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        status,
        signIn: doSignIn,
        signUp: doSignUp,
        signOut: doSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
