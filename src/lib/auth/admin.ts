/**
 * Admin helpers on top of the mock auth store. Reads/writes the same
 * localStorage bucket used by store.ts. When Lovable Cloud is enabled,
 * this file is replaced with server-side admin queries — the exported
 * API stays identical.
 */
import type { Role, User } from "./types";

const USERS_KEY = "vitaflow.users";

interface StoredUser extends User {
  passwordHash: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function hashPassword(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h << 5) - h + pw.charCodeAt(i);
  return `mock$${h.toString(16)}$${pw.length}`;
}

function genId(prefix = "u"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function readUsers(): StoredUser[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function listUsers(): User[] {
  return readUsers().map(({ passwordHash: _p, ...u }) => u);
}

export function countByRole(): Record<Role, number> {
  const users = readUsers();
  const acc: Record<Role, number> = { admin: 0, doctor: 0, receptionist: 0, patient: 0 };
  for (const u of users) acc[u.role]++;
  return acc;
}

export interface CreateStaffInput {
  email: string;
  fullName: string;
  role: Exclude<Role, "patient">;
  password: string;
  specialty?: string;
}

export function createStaff(input: CreateStaffInput): User {
  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account with that email already exists.");
  }
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
  const user: StoredUser = {
    id: genId(input.role.slice(0, 3)),
    email: input.email.trim(),
    fullName: input.fullName.trim(),
    role: input.role,
    specialty: input.specialty?.trim() || undefined,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  writeUsers([...users, user]);
  const { passwordHash: _p, ...safe } = user;
  return safe;
}

export function deleteUser(id: string): void {
  const users = readUsers();
  writeUsers(users.filter((u) => u.id !== id));
}
