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

function readAll(): QueueEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as QueueEntry[];
    if (!Array.isArray(parsed)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

function writeAll(entries: QueueEntry[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  emit();
}

// ---- seed --------------------------------------------------------------

function seed(): QueueEntry[] {
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();
  const entries: QueueEntry[] = [
    {
      id: genId(),
      token: "A-114",
      patientName: "Marcus Holloway",
      matricNumber: "CSC/2021/044",
      reason: "Routine vaccination",
      priority: "routine",
      status: "in_consultation",
      doctorName: "Dr. Aris",
      room: "Room 02",
      registeredBy: "seed",
      createdAt: iso(28),
      calledAt: iso(6),
    },
    {
      id: genId(),
      token: "E-002",
      patientName: "Sarah Jenkins",
      matricNumber: "EEE/2022/019",
      reason: "Chest pain — needs urgent review",
      priority: "emergency",
      status: "waiting",
      registeredBy: "seed",
      createdAt: iso(4),
    },
    {
      id: genId(),
      token: "A-115",
      patientName: "Lydia Chen",
      matricNumber: "ARC/2023/108",
      reason: "General consultation",
      priority: "routine",
      status: "waiting",
      registeredBy: "seed",
      createdAt: iso(16),
    },
    {
      id: genId(),
      token: "A-116",
      patientName: "David Owalabi",
      matricNumber: "MEC/2020/077",
      reason: "Follow-up on lab results",
      priority: "routine",
      status: "waiting",
      registeredBy: "seed",
      createdAt: iso(10),
    },
    {
      id: genId(),
      token: "A-113",
      patientName: "Adaeze Nwafor",
      matricNumber: "LAW/2022/002",
      reason: "Migraine",
      priority: "routine",
      status: "completed",
      doctorName: "Dr. Aris",
      room: "Room 02",
      registeredBy: "seed",
      createdAt: iso(90),
      calledAt: iso(70),
      completedAt: iso(52),
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
  const all = readAll();
  const groups: Record<string, QueueEntry[]> = {
    ic: [],
    we: [],
    wr: [],
    co: [],
    cn: [],
  };
  for (const e of all) {
    if (e.status === "in_consultation") groups.ic.push(e);
    else if (e.status === "waiting" && e.priority === "emergency") groups.we.push(e);
    else if (e.status === "waiting") groups.wr.push(e);
    else if (e.status === "completed") groups.co.push(e);
    else groups.cn.push(e);
  }
  groups.ic.sort((a, b) => (a.calledAt ?? "").localeCompare(b.calledAt ?? ""));
  groups.we.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  groups.wr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  groups.co.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  groups.cn.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...groups.ic, ...groups.we, ...groups.wr, ...groups.co, ...groups.cn];
}

export function listWaiting(): QueueEntry[] {
  return listQueue().filter((e) => e.status === "waiting" || e.status === "in_consultation");
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
    status: "waiting",
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
  if (status === "in_consultation") stamp.calledAt = now;
  if (status === "completed" || status === "cancelled") stamp.completedAt = now;
  return updateEntry(id, { ...stamp, ...extra });
}

export function togglePriority(id: string): QueueEntry | null {
  const all = readAll();
  const entry = all.find((e) => e.id === id);
  if (!entry || entry.status !== "waiting") return null;
  return updateEntry(id, {
    priority: entry.priority === "emergency" ? "routine" : "emergency",
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
  const all = readAll();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayEntries = all.filter((e) => new Date(e.createdAt) >= startOfDay);

  const completed = todayEntries.filter((e) => e.status === "completed");
  const durations = completed
    .map((e) =>
      e.calledAt && e.completedAt
        ? (new Date(e.completedAt).getTime() - new Date(e.calledAt).getTime()) / 60_000
        : null,
    )
    .filter((n): n is number => n !== null && n > 0);
  const avgConsultMin = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 12; // sensible default before any completions

  const waiting = todayEntries.filter((e) => e.status === "waiting");
  const inConsult = todayEntries.filter((e) => e.status === "in_consultation").length;
  const emergencies = waiting.filter((e) => e.priority === "emergency").length;

  // Est wait for the *last* waiting patient in the ordered queue.
  const estWaitMin = Math.round((waiting.length + inConsult) * avgConsultMin);

  return {
    totalToday: todayEntries.length,
    waiting: waiting.length,
    emergencies,
    inConsultation: inConsult,
    completedToday: completed.length,
    avgConsultMin: Math.round(avgConsultMin),
    estWaitMin,
  };
}

/** Estimated wait time (min) until this specific entry is called. */
export function estimateWaitFor(id: string): number {
  const ordered = listWaiting();
  const idx = ordered.findIndex((e) => e.id === id);
  if (idx === -1) return 0;
  const { avgConsultMin } = computeMetrics();
  const ahead = ordered.slice(0, idx).filter((e) => e.status !== "in_consultation").length;
  const inConsult = ordered.slice(0, idx).some((e) => e.status === "in_consultation") ? 1 : 0;
  return Math.max(0, Math.round((ahead + inConsult) * avgConsultMin));
}

// ---- utils -------------------------------------------------------------

function genId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
