import { useEffect, useSyncExternalStore } from "react";
import {
  computeMetrics,
  estimateWaitFor,
  listQueue,
  listWaiting,
  subscribe,
  type QueueMetrics,
} from "./store";
import type { QueueEntry } from "./types";

const emptyList: QueueEntry[] = [];
const emptyMetrics: QueueMetrics = {
  totalToday: 0,
  waiting: 0,
  emergencies: 0,
  inConsultation: 0,
  completedToday: 0,
  avgConsultMin: 0,
  estWaitMin: 0,
};

function getServerSnapshot(): null {
  return null;
}

/**
 * Subscribes to the queue store. Returns the ordered list.
 * `useSyncExternalStore` guarantees no tearing across concurrent renders.
 */
export function useQueue(): QueueEntry[] {
  const snap = useSyncExternalStore(subscribe, listQueue, getServerSnapshot);
  return snap ?? emptyList;
}

export function useWaiting(): QueueEntry[] {
  const snap = useSyncExternalStore(subscribe, listWaiting, getServerSnapshot);
  return snap ?? emptyList;
}

export function useMetrics(): QueueMetrics {
  const snap = useSyncExternalStore(subscribe, computeMetrics, getServerSnapshot);
  return snap ?? emptyMetrics;
}

/**
 * Live-refreshing wait estimate for a single entry. Recomputes when the
 * store mutates AND every 15s so the clock moves even while idle.
 */
export function useWaitEstimate(id: string | undefined): number {
  const snap = useSyncExternalStore(
    subscribe,
    () => (id ? estimateWaitFor(id) : 0),
    getServerSnapshot,
  );
  // Force a re-render every 15s so the "next patient" prediction ticks.
  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => {
      // Trigger by dispatching a storage-like update: we bump a benign key
      // in localStorage which our subscribe listener picks up.
      if (typeof window === "undefined") return;
      window.dispatchEvent(new StorageEvent("storage", { key: "vitaflow.tick" }));
    }, 15_000);
    return () => clearInterval(t);
  }, [id]);
  return snap ?? 0;
}
