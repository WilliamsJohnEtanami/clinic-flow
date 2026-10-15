/**
 * Client-side queue store (mock). Backed by localStorage with a
 * pub/sub layer so multiple tabs and multiple hooks stay in sync.
 *
 * Priority discipline: NON-PREEMPTIVE. An emergency entry is inserted
 * at the front of the waiting list but does NOT interrupt an
 * `in_consultation` entry. The store is the single source of truth
 * for ordering — UI just renders `listQueue()`.
 *
 * When Lovable Cloud is enabled the exported API stays identical.
 */
import type { Priority, QueueEntry, QueueStatus } from "./types";

const QUEUE_KEY = "vitaflow.queue";
const COUNTER_KEY = "vitaflow.queue.counter"; // { date: 'YYYY-MM-DD', a: n, e: n }

// ---- storage helpers ---------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// Cached parse — critical for useSyncExternalStore snapshot stability.
let _rawCache: string | null = null;
let _parsedCache: QueueEntry[] = [];

function readAll(): QueueEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return seed();
    if (raw === _rawCache) return _parsedCache;
    const parsed = JSON.parse(raw) as QueueEntry[];
    if (!Array.isArray(parsed)) return seed();
    _rawCache = raw;
    _parsedCache = parsed;
    return parsed;
  } catch {
    return seed();
  }
}

function writeAll(entries: QueueEntry[]): void {
  if (!isBrowser()) return;
  const raw = JSON.stringify(entries);
  localStorage.setItem(QUEUE_KEY, raw);
  _rawCache = raw;
  _parsedCache = entries;
  _snapshotVersion = raw;
  emit();
}

// Snapshot memoization for useSyncExternalStore
let _snapshotVersion: string | null = null;
let _listQueueCache: QueueEntry[] = [];
let _listWaitingCache: QueueEntry[] = [];
let _metricsCache: QueueMetrics | null = null;

function snapshotKey(): string {
  if (!isBrowser()) return "server";
  return localStorage.getItem(QUEUE_KEY) ?? "empty";
}

// ---- seed --------------------------------------------------------------

function seed(): QueueEntry[] {
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();
  const seedUserId = "seed-user-id";
  const doctorId = "doctor-001";
  
  const entries: QueueEntry[] = [
    {
      id: genId(),
      token: "A-114",
      patientId: "patient-001",
      patient: {
        id: "patient-001",
        userId: "user-001",
        fullName: "Marcus Holloway",
        matricNumber: "CSC/2021/044",
      },
      queueType: "WALK_IN",
      reason: "Routine vaccination",
      priority: "ROUTINE",
      status: "IN_CONSULTATION",
      doctorId,
      doctor: {
        id: doctorId,
        fullName: "Dr. Aris",
        email: "doctor@vitaflow.edu",
      },
      room: "Room 02",
      registeredById: seedUserId,
      registeredAt: iso(28),
      createdAt: iso(28),
      updatedAt: iso(28),
      calledAt: iso(6),
      consultationStartAt: iso(6),
    },
    {
      id: genId(),
      token: "E-002",
      patientId: "patient-002",
      patient: {
        id: "patient-002",
        userId: "user-002",
        fullName: "Sarah Jenkins",
        matricNumber: "EEE/2022/019",
      },
      queueType: "WALK_IN",
      reason: "Chest pain — needs urgent review",
      priority: "EMERGENCY",
      status: "WAITING",
      registeredById: seedUserId,
      registeredAt: iso(4),
      createdAt: iso(4),
      updatedAt: iso(4),
    },
    {
      id: genId(),
      token: "A-115",
      patientId: "patient-003",
      patient: {
        id: "patient-003",
        userId: "user-003",
        fullName: "Lydia Chen",
        matricNumber: "ARC/2023/108",
      },
      queueType: "WALK_IN",
      reason: "General consultation",
      priority: "ROUTINE",
      status: "WAITING",
      registeredById: seedUserId,
      registeredAt: iso(16),
      createdAt: iso(16),
      updatedAt: iso(16),
    },
    {
      id: genId(),
      token: "A-116",
      patientId: "patient-004",
      patient: {
        id: "patient-004",
        userId: "user-004",
        fullName: "David Owalabi",
        matricNumber: "MEC/2020/077",
      },
      queueType: "WALK_IN",
      reason: "Follow-up on lab results",
      priority: "ROUTINE",
      status: "WAITING",
      registeredById: seedUserId,
      registeredAt: iso(10),
      createdAt: iso(10),
      updatedAt: iso(10),
    },
    {
      id: genId(),
      token: "A-113",
      patientId: "patient-005",
      patient: {
        id: "patient-005",
        userId: "user-005",
        fullName: "Adaeze Nwafor",
        matricNumber: "LAW/2022/002",
      },
      queueType: "WALK_IN",
      reason: "Migraine",
      priority: "ROUTINE",
      status: "COMPLETED",
      doctorId,
      doctor: {
        id: doctorId,
        fullName: "Dr. Aris",
        email: "doctor@vitaflow.edu",
      },
      room: "Room 02",
      registeredById: seedUserId,
      registeredAt: iso(90),
      createdAt: iso(90),
      updatedAt: iso(52),
      calledAt: iso(70),
      consultationStartAt: iso(70),
      consultationEndAt: iso(52),
    },
  ];
  writeAllRaw(entries);
  writeCounter({ date: today(), a: 116, e: 2 });
  return entries;
}

function writeAllRaw(entries: QueueEntry[]) {
  if (!isBrowser()) return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

// ---- counter / token generation ---------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Counter {
  date: string;
  a: number;
  e: number;
}

function readCounter(): Counter {
  if (!isBrowser()) return { date: today(), a: 0, e: 0 };
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (!raw) return { date: today(), a: 0, e: 0 };
    const parsed = JSON.parse(raw) as Counter;
    if (parsed.date !== today()) return { date: today(), a: 0, e: 0 };
    return parsed;
  } catch {
    return { date: today(), a: 0, e: 0 };
  }
}

function writeCounter(c: Counter): void {
  if (!isBrowser()) return;
  localStorage.setItem(COUNTER_KEY, JSON.stringify(c));
}

function nextToken(priority: Priority): string {
  const c = readCounter();
  if (priority === "emergency") {
    c.e += 1;
    writeCounter(c);
    return `E-${String(c.e).padStart(3, "0")}`;
  }
  c.a += 1;
  writeCounter(c);
  return `A-${String(c.a).padStart(3, "0")}`;
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
      if (e.key === QUEUE_KEY) l();
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

/**
 * Ordered list for display. Non-preemptive priority:
 *   1. in_consultation (never interrupted, sorted by calledAt asc)
 *   2. waiting · emergency (FIFO)
 *   3. waiting · routine (FIFO)
 *   4. completed (most recent first)
 *   5. cancelled (most recent first)
 */
export function listQueue(): QueueEntry[] {
  const key = snapshotKey();
  if (key === _snapshotVersion && _listQueueCache.length >= 0 && _snapshotVersion !== null) {
    return _listQueueCache;
  }
  const all = readAll();
  const groups: Record<string, QueueEntry[]> = { ic: [], we: [], wr: [], co: [], cn: [] };
  for (const e of all) {
    if (e.status === "IN_CONSULTATION") groups.ic.push(e);
    else if (e.status === "WAITING" && e.priority === "EMERGENCY") groups.we.push(e);
    else if (e.status === "WAITING") groups.wr.push(e);
    else if (e.status === "COMPLETED") groups.co.push(e);
    else groups.cn.push(e);
  }
  groups.ic.sort((a, b) => (a.calledAt ?? "").localeCompare(b.calledAt ?? ""));
  groups.we.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  groups.wr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  groups.co.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  groups.cn.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const result = [...groups.ic, ...groups.we, ...groups.wr, ...groups.co, ...groups.cn];
  _snapshotVersion = key;
  _listQueueCache = result;
  _listWaitingCache = [...groups.ic, ...groups.we, ...groups.wr];
  _metricsCache = null; // metrics is derived separately; invalidate
  return result;
}

export function listWaiting(): QueueEntry[] {
  listQueue(); // ensure caches populated
  return _listWaitingCache;
}

// Waiting means WAITING or IN_CONSULTATION status
function isWaitingEntry(e: QueueEntry): boolean {
  return e.status === "WAITING" || e.status === "IN_CONSULTATION";
}

// ---- mutations ---------------------------------------------------------

export interface CreateEntryInput {
  patientName: string;
  matricNumber?: string;
  phone?: string;
  reason: string;
  priority: Priority;
  notes?: string;
  registeredBy: string;
}

export function createEntry(input: CreateEntryInput): QueueEntry {
  const entry: QueueEntry = {
    id: genId(),
    token: nextToken(input.priority),
    patientName: input.patientName.trim(),
    matricNumber: input.matricNumber?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    reason: input.reason.trim(),
    priority: input.priority,
    status: "WAITING",
    notes: input.notes?.trim() || undefined,
    registeredBy: input.registeredBy,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry;
}

export function updateEntry(id: string, patch: Partial<QueueEntry>): QueueEntry | null {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  writeAll(all);
  return all[idx];
}

export function setStatus(id: string, status: QueueStatus, extra: Partial<QueueEntry> = {}) {
  const now = new Date().toISOString();
  const stamp: Partial<QueueEntry> = { status };
  if (status === "IN_CONSULTATION") stamp.calledAt = now;
  if (status === "COMPLETED" || status === "CANCELLED") stamp.completedAt = now;
  return updateEntry(id, { ...stamp, ...extra });
}

export function togglePriority(id: string): QueueEntry | null {
  const all = readAll();
  const entry = all.find((e) => e.id === id);
  if (!entry || entry.status !== "WAITING") return null;
  return updateEntry(id, {
    priority: entry.priority === "EMERGENCY" ? "ROUTINE" : "EMERGENCY",
  });
}

/** Wipe the store — useful for demos. */
export function resetQueue(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(QUEUE_KEY);
  localStorage.removeItem(COUNTER_KEY);
  seed();
  emit();
}

// ---- metrics ----------------------------------------------------------

export interface QueueMetrics {
  totalToday: number;
  waiting: number;
  emergencies: number;
  inConsultation: number;
  completedToday: number;
  avgConsultMin: number;
  estWaitMin: number;
}

export function computeMetrics(): QueueMetrics {
  const key = snapshotKey();
  if (_metricsCache && key === _snapshotVersion) return _metricsCache;
  const all = readAll();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayEntries = all.filter((e) => new Date(e.createdAt) >= startOfDay);

  const completed = todayEntries.filter((e) => e.status === "COMPLETED");
  const durations = completed
    .map((e) =>
      e.calledAt && e.completedAt
        ? (new Date(e.completedAt).getTime() - new Date(e.calledAt).getTime()) / 60_000
        : null,
    )
    .filter((n): n is number => n !== null && n > 0);
  const avgConsultMin = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 12;

  const waiting = todayEntries.filter((e) => e.status === "WAITING");
  const inConsult = todayEntries.filter((e) => e.status === "IN_CONSULTATION").length;
  const emergencies = waiting.filter((e) => e.priority === "EMERGENCY").length;
  const estWaitMin = Math.round((waiting.length + inConsult) * avgConsultMin);

  const result: QueueMetrics = {
    totalToday: todayEntries.length,
    waiting: waiting.length,
    emergencies,
    inConsultation: inConsult,
    completedToday: completed.length,
    avgConsultMin: Math.round(avgConsultMin),
    estWaitMin,
  };
  _metricsCache = result;
  return result;
}

/** Estimated wait time (min) until this specific entry is called. */
export function estimateWaitFor(id: string): number {
  const ordered = listWaiting();
  const idx = ordered.findIndex((e) => e.id === id);
  if (idx === -1) return 0;
  const { avgConsultMin } = computeMetrics();
  const ahead = ordered.slice(0, idx).filter((e) => e.status !== "IN_CONSULTATION").length;
  const inConsult = ordered.slice(0, idx).some((e) => e.status === "IN_CONSULTATION") ? 1 : 0;
  return Math.max(0, Math.round((ahead + inConsult) * avgConsultMin));
}

// ---- utils -------------------------------------------------------------

function genId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
