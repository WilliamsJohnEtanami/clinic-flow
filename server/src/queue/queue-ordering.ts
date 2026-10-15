/**
 * Pure queue-ordering logic — the heart of the priority queue engine.
 * No I/O, no Prisma, no Express — 100% unit-testable business logic.
 *
 * MODIFIED NON-PREEMPTIVE PRIORITY QUEUE:
 *   1. Routine patients are ordered FIFO.
 *   2. Emergency patients outrank routine patients.
 *   3. Emergency patients are also FIFO among themselves.
 *   4. An emergency arrival never interrupts an in-progress consultation.
 *   5. When a consultation completes, the highest-priority waiting patient
 *      (emergency before routine) is selected next.
 *   6. Ties within the same priority go to whoever arrived first.
 */

export type QueueStatusLike =
  "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "CANCELLED" | "NO_SHOW";

export type PriorityLike = "EMERGENCY" | "ROUTINE";

export interface OrderableEntry {
  id: string;
  status: QueueStatusLike;
  priority: PriorityLike;
  registeredAt: Date | string;
  calledAt?: Date | string | null;
  consultationStartAt?: Date | string | null;
  consultationEndAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

function toTime(v: Date | string | null | undefined): number {
  if (!v) return 0;
  return new Date(v).getTime();
}

/**
 * Orders the full entry set for display:
 *   in_consultation → called → waiting·emergency → waiting·routine →
 *   skipped → completed → cancelled/no_show
 */
export function rankQueueEntries<T extends OrderableEntry>(entries: T[]): T[] {
  const groups: Record<string, T[]> = {
    inConsultation: [],
    called: [],
    waitingEmergency: [],
    waitingRoutine: [],
    skipped: [],
    completed: [],
    inactive: [],
  };

  for (const e of entries) {
    if (e.status === "IN_CONSULTATION") groups.inConsultation.push(e);
    else if (e.status === "CALLED") groups.called.push(e);
    else if (e.status === "WAITING" && e.priority === "EMERGENCY") groups.waitingEmergency.push(e);
    else if (e.status === "WAITING") groups.waitingRoutine.push(e);
    else if (e.status === "SKIPPED") groups.skipped.push(e);
    else if (e.status === "COMPLETED") groups.completed.push(e);
    else groups.inactive.push(e);
  }

  groups.inConsultation.sort(
    (a, b) => toTime(a.consultationStartAt) - toTime(b.consultationStartAt),
  );
  groups.called.sort((a, b) => toTime(a.calledAt) - toTime(b.calledAt));
  groups.waitingEmergency.sort((a, b) => toTime(a.registeredAt) - toTime(b.registeredAt));
  groups.waitingRoutine.sort((a, b) => toTime(a.registeredAt) - toTime(b.registeredAt));
  groups.skipped.sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
  groups.completed.sort((a, b) => toTime(b.consultationEndAt) - toTime(a.consultationEndAt));
  groups.inactive.sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));

  return [
    ...groups.inConsultation,
    ...groups.called,
    ...groups.waitingEmergency,
    ...groups.waitingRoutine,
    ...groups.skipped,
    ...groups.completed,
    ...groups.inactive,
  ];
}

/** Entries that still occupy a place in the live queue. */
export function filterActive<T extends OrderableEntry>(entries: T[]): T[] {
  return entries.filter(
    (e) => e.status === "WAITING" || e.status === "CALLED" || e.status === "IN_CONSULTATION",
  );
}

/**
 * Selects the next patient to call for a doctor who has just become free.
 * Non-preemptive by construction: this is only invoked once the caller has
 * confirmed the doctor has no active CALLED/IN_CONSULTATION entry — an
 * emergency arrival can never preempt a consultation already underway.
 */
export function selectNextForCall<T extends OrderableEntry>(entries: T[]): T | undefined {
  const waiting = entries.filter((e) => e.status === "WAITING");
  return rankQueueEntries(waiting)[0];
}

export interface EwtInput {
  id: string;
  status: QueueStatusLike;
  priority: PriorityLike;
  registeredAt: Date | string;
  calledAt?: Date | string | null;
  consultationStartAt?: Date | string | null;
}

/**
 * Computes estimated wait time (minutes) for every WAITING entry from the
 * current active queue and a rolling average consultation duration.
 * Each active entry ranked ahead (in-consultation, called, or waiting)
 * counts as one "slot" — consistent with the non-preemptive model where a
 * consultation in progress still occupies the doctor until it completes.
 */
export function computeEstimatedWaitMinutes(
  entries: EwtInput[],
  avgConsultMin: number,
): Map<string, number> {
  const active = filterActive(entries as OrderableEntry[]) as unknown as EwtInput[];
  const ranked = rankQueueEntries(active as unknown as OrderableEntry[]) as unknown as EwtInput[];

  const result = new Map<string, number>();
  let slotsAhead = 0;

  for (const entry of ranked) {
    if (entry.status === "WAITING") {
      result.set(entry.id, Math.max(0, Math.round(slotsAhead * avgConsultMin)));
      slotsAhead += 1;
    } else {
      slotsAhead += 1;
    }
  }

  return result;
}
