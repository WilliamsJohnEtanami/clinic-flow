/**
 * Client-side appointments store (mock). Backed by localStorage with a
 * pub/sub layer matching the queue store's shape.
 *
 * Check-in promotes an appointment into the live queue via the queue store,
 * so the receptionist / doctor UIs need no special-casing.
 */
import type { Appointment, AppointmentStatus } from "./types";
import { createEntry } from "@/lib/queue/store";

const APPT_KEY = "vitaflow.appointments";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// Cached parse — critical for useSyncExternalStore snapshot stability.
let _rawCache: string | null = null;
let _parsedCache: Appointment[] = [];

// Snapshot caching for useSyncExternalStore getSnapshot stability
let _listAppointmentsSnapshotVersion: string | null = null;
let _listAppointmentsCache: Appointment[] = [];
let _listAppointmentsForCache: Map<string, Appointment[]> = new Map();

function snapshotKey(): string {
  if (!isBrowser()) return "server";
  return localStorage.getItem(APPT_KEY) ?? "empty";
}

function readAll(): Appointment[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(APPT_KEY);
    if (!raw) return seed();
    if (raw === _rawCache) return _parsedCache;
    const parsed = JSON.parse(raw) as Appointment[];
    if (!Array.isArray(parsed)) return seed();
    _rawCache = raw;
    _parsedCache = parsed;
    return parsed;
  } catch {
    return seed();
  }
}

function writeAll(entries: Appointment[]): void {
  if (!isBrowser()) return;
  const raw = JSON.stringify(entries);
  localStorage.setItem(APPT_KEY, raw);
  _rawCache = raw;
  _parsedCache = entries;
  // Invalidate snapshot caches
  _listAppointmentsSnapshotVersion = null;
  _listAppointmentsCache = [];
  _listAppointmentsForCache.clear();
  emit();
}

// ---- seed --------------------------------------------------------------

function seed(): Appointment[] {
  const now = new Date();
  const at = (hours: number, mins = 0, dayOffset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };
  const entries: Appointment[] = [
    {
      id: genId(),
      patientName: "Kemi Adebayo",
      matricNumber: "MED/2023/012",
      reason: "Annual physical",
      scheduledFor: at(9, 0),
      durationMin: 20,
      doctorName: "Dr. Aris",
      doctorId: "doc-aris",
      status: "scheduled",
      createdBy: "seed",
      createdAt: new Date(now.getTime() - 86_400_000).toISOString(),
    },
    {
      id: genId(),
      patientName: "Ibrahim Musa",
      matricNumber: "ENG/2021/091",
      reason: "Prescription refill",
      scheduledFor: at(10, 30),
      durationMin: 15,
      doctorName: "Dr. Aris",
      doctorId: "doc-aris",
      status: "scheduled",
      createdBy: "seed",
      createdAt: new Date(now.getTime() - 86_400_000).toISOString(),
    },
    {
      id: genId(),
      patientName: "Tunde Okafor",
      matricNumber: "SCI/2022/103",
      reason: "Sports physical clearance",
      scheduledFor: at(14, 0),
      durationMin: 30,
      doctorName: "Dr. Nkechi",
      doctorId: "doc-nkechi",
      status: "scheduled",
      createdBy: "seed",
      createdAt: new Date(now.getTime() - 172_800_000).toISOString(),
    },
    {
      id: genId(),
      patientName: "Fatima Bello",
      matricNumber: "ART/2024/056",
      reason: "Follow-up · lab review",
      scheduledFor: at(11, 15, 1),
      durationMin: 20,
      doctorName: "Dr. Aris",
      doctorId: "doc-aris",
      status: "scheduled",
      createdBy: "seed",
      createdAt: new Date(now.getTime() - 3_600_000).toISOString(),
    },
    {
      id: genId(),
      patientName: "Chinedu Eze",
      matricNumber: "LAW/2020/018",
      reason: "Blood pressure monitoring",
      scheduledFor: at(8, 30, -1),
      durationMin: 15,
      doctorName: "Dr. Nkechi",
      doctorId: "doc-nkechi",
      status: "completed",
      createdBy: "seed",
      createdAt: new Date(now.getTime() - 259_200_000).toISOString(),
    },
  ];
  if (isBrowser()) localStorage.setItem(APPT_KEY, JSON.stringify(entries));
  _rawCache = JSON.stringify(entries);
  _parsedCache = entries;
  return entries;
}

// ---- pub/sub -----------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  if (isBrowser()) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === APPT_KEY) l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => listeners.delete(l);
}

// ---- ordering ----------------------------------------------------------

/** Sort by scheduledFor asc. Cached for useSyncExternalStore stability. */
export function listAppointments(): Appointment[] {
  const key = snapshotKey();
  if (key === _listAppointmentsSnapshotVersion && _listAppointmentsCache.length >= 0 && _listAppointmentsSnapshotVersion !== null) {
    return _listAppointmentsCache;
  }
  const result = [...readAll()].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  _listAppointmentsSnapshotVersion = key;
  _listAppointmentsCache = result;
  return result;
}

export function listAppointmentsFor(opts: {
  doctorId?: string;
  patientId?: string;
  day?: string; // YYYY-MM-DD
  status?: AppointmentStatus;
}): Appointment[] {
  // Generate a cache key based on the options
  const cacheKey = JSON.stringify(opts);
  const cached = _listAppointmentsForCache.get(cacheKey);
  
  if (cached !== undefined && _listAppointmentsSnapshotVersion === snapshotKey()) {
    return cached;
  }
  
  const result = listAppointments().filter((a) => {
    if (opts.doctorId && a.doctorId !== opts.doctorId) return false;
    if (opts.patientId && a.patientId !== opts.patientId) return false;
    if (opts.status && a.status !== opts.status) return false;
    if (opts.day && a.scheduledFor.slice(0, 10) !== opts.day) return false;
    return true;
  });
  
  _listAppointmentsForCache.set(cacheKey, result);
  return result;
}

// ---- mutations ---------------------------------------------------------

export interface CreateApptInput {
  patientName: string;
  patientId?: string;
  matricNumber?: string;
  phone?: string;
  reason: string;
  scheduledFor: string;
  durationMin?: number;
  doctorId?: string;
  doctorName?: string;
  notes?: string;
  createdBy: string;
}

export function createAppointment(input: CreateApptInput): Appointment {
  const appt: Appointment = {
    id: genId(),
    patientName: input.patientName.trim(),
    patientId: input.patientId,
    matricNumber: input.matricNumber?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    reason: input.reason.trim(),
    scheduledFor: input.scheduledFor,
    durationMin: input.durationMin ?? 20,
    doctorId: input.doctorId,
    doctorName: input.doctorName?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    status: "scheduled",
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(appt);
  writeAll(all);
  return appt;
}

export function updateAppointment(id: string, patch: Partial<Appointment>): Appointment | null {
  const all = readAll();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  writeAll(all);
  return all[idx];
}

export function cancelAppointment(id: string): Appointment | null {
  return updateAppointment(id, { status: "cancelled" });
}

export function markNoShow(id: string): Appointment | null {
  return updateAppointment(id, { status: "no_show" });
}

/**
 * Check an appointment into the live queue. Creates a queue entry with
 * routine priority and links it back to the appointment for traceability.
 */
export function checkInAppointment(
  id: string,
  registeredBy: string,
): { appointment: Appointment; queueEntryId: string } | null {
  const all = readAll();
  const appt = all.find((a) => a.id === id);
  if (!appt || appt.status !== "scheduled") return null;

  const entry = createEntry({
    patientName: appt.patientName,
    matricNumber: appt.matricNumber,
    phone: appt.phone,
    reason: appt.reason,
    priority: "routine",
    notes: appt.notes,
    registeredBy,
  });

  const updated = updateAppointment(id, {
    status: "checked_in",
    queueEntryId: entry.id,
    checkedInAt: new Date().toISOString(),
  });
  if (!updated) return null;
  return { appointment: updated, queueEntryId: entry.id };
}

export function resetAppointments(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(APPT_KEY);
  seed();
  emit();
}

// ---- utils -------------------------------------------------------------

function genId(): string {
  return `ap_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
