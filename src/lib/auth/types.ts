/**
 * Auth domain types. This is the contract every UI surface consumes.
 * When Lovable Cloud is enabled later, the mock store is swapped for a
 * Supabase-backed implementation with the SAME shape — no UI changes.
 */

export type Role = "admin" | "doctor" | "receptionist" | "patient";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** Doctor-specific */
  specialty?: string;
  /** Patient-specific */
  matricNumber?: string;
  createdAt: string;
}

export interface Session {
  user: User;
  token: string;
  issuedAt: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: "patient";
  matricNumber: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  receptionist: "Receptionist",
  patient: "Patient",
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  doctor: "/doctor",
  receptionist: "/reception",
  patient: "/patient",
};
