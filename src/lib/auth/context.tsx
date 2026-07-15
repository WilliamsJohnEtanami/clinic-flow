import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Credentials, RegisterPayload, Session, User } from "./types";
import { getStoredSession, persistSession, signIn, signOut, signUp } from "./store";

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
    setSession(existing);
    setStatus(existing ? "authenticated" : "anonymous");
  }, []);

  const doSignIn = useCallback(async (creds: Credentials) => {
    const s = await signIn(creds);
    setSession(s);
    setStatus("authenticated");
    return s;
  }, []);

  const doSignUp = useCallback(async (payload: RegisterPayload) => {
    const s = await signUp(payload);
    setSession(s);
    setStatus("authenticated");
    return s;
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut();
    persistSession(null);
    setSession(null);
    setStatus("anonymous");
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
