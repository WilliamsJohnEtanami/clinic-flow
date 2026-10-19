/**
 * Client-side auth store (mock). Backed by localStorage so the demo
 * survives reloads. This module is browser-only — never import from a
 * loader or server function.
 *
 * When Lovable Cloud is enabled we replace this file's implementation
 * with Supabase Auth calls; the exported API stays identical.
 */
import type { Credentials, RegisterPayload, Role, Session, User } from "./types";

const USERS_KEY = "vitaflow.users";
const SESSION_KEY = "vitaflow.session";

interface StoredUser extends User {
  passwordHash: string;
}

// ---- seed --------------------------------------------------------------

const SEED_USERS: Array<Omit<StoredUser, "id" | "createdAt">> = [
  {
    email: "admin@vitaflow.edu",
    fullName: "Dr. Ada Okonkwo",
    role: "admin",
    passwordHash: hashPassword("admin123"),
  },
  {
    email: "doctor@vitaflow.edu",
    fullName: "Dr. Emeka Aris",
    role: "doctor",
    specialty: "General Practice",
    passwordHash: hashPassword("doctor123"),
  },
  {
    email: "reception@vitaflow.edu",
    fullName: "Nkechi Adebayo",
    role: "receptionist",
    passwordHash: hashPassword("reception123"),
  },
  {
    email: "patient@example.test",
    fullName: "Demo Patient",
    role: "patient",
    matricNumber: "DEMO/0001",
    passwordHash: hashPassword("patient123"),
  },
];

// ---- utils -------------------------------------------------------------

function hashPassword(pw: string): string {
  // NOT a real hash. Sufficient for a mock store; Lovable Cloud replaces
  // this with bcrypt/argon2 via Supabase Auth.
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h << 5) - h + pw.charCodeAt(i);
  return `mock$${h.toString(16)}$${pw.length}`;
}

function genId(prefix = "u"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readUsers(): StoredUser[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return seedUsers();
    const parsed = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedUsers();
    return parsed;
  } catch {
    return seedUsers();
  }
}

function writeUsers(users: StoredUser[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function seedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  const users: StoredUser[] = SEED_USERS.map((u) => ({
    ...u,
    id: genId(u.role.slice(0, 3)),
    createdAt: now,
  }));
  writeUsers(users);
  return users;
}

function stripPassword(u: StoredUser): User {
  const { passwordHash: _pw, ...safe } = u;
  return safe;
}

// ---- public api --------------------------------------------------------

export function getStoredSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function persistSession(session: Session | null): void {
  if (!isBrowser()) return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export async function signIn(creds: Credentials): Promise<Session> {
  await tick();
  const users = readUsers();
  const match = users.find((u) => u.email.toLowerCase() === creds.email.toLowerCase());
  if (!match) throw new Error("No account found with that email.");
  if (match.passwordHash !== hashPassword(creds.password)) throw new Error("Incorrect password.");

  const session: Session = {
    user: stripPassword(match),
    token: `mock.${match.id}.${Date.now().toString(36)}`,
    issuedAt: new Date().toISOString(),
  };
  persistSession(session);
  return session;
}

export async function signUp(payload: RegisterPayload): Promise<Session> {
  await tick();
  if (payload.password.length < 6) throw new Error("Password must be at least 6 characters.");
  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase()))
    throw new Error("An account with that email already exists.");

  const user: StoredUser = {
    id: genId(payload.role.slice(0, 3)),
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    matricNumber: payload.matricNumber,
    passwordHash: hashPassword(payload.password),
    createdAt: new Date().toISOString(),
  };
  writeUsers([...users, user]);

  const session: Session = {
    user: stripPassword(user),
    token: `mock.${user.id}.${Date.now().toString(36)}`,
    issuedAt: new Date().toISOString(),
  };
  persistSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await tick();
  persistSession(null);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await tick();
  const users = readUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  // Never reveal whether an account exists — real auth systems don't either.
  if (!exists) return;
}

/** Demo helper: return seed credentials for the given role. */
export function getSeedCredentials(role: Role): { email: string; password: string } | null {
  const seed = SEED_USERS.find((u) => u.role === role);
  if (!seed) return null;
  // Reverse from the (very predictable) mock seed above.
  const passwords: Record<Role, string> = {
    admin: "admin123",
    doctor: "doctor123",
    receptionist: "reception123",
    patient: "patient123",
  };
  return { email: seed.email, password: passwords[role] };
}

function tick(): Promise<void> {
  // Simulate network latency so loading states are visible.
  return new Promise((r) => setTimeout(r, 250));
}
