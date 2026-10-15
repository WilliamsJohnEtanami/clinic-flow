import type { QueueMetrics } from "./store";
import type { QueueEntry } from "./types";

export function computeApiMetrics(queue: QueueEntry[]): QueueMetrics {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = queue.filter((entry) => new Date(entry.registeredAt) >= startOfDay);
  const completed = today.filter((entry) => entry.status === "COMPLETED");
  const durations = completed
    .filter((entry) => entry.consultationStartAt && entry.consultationEndAt)
    .map(
      (entry) =>
        (new Date(entry.consultationEndAt!).getTime() -
          new Date(entry.consultationStartAt!).getTime()) /
        60_000,
    )
    .filter((duration) => duration > 0);
  const avgConsultMin = durations.length
    ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
    : 12;
  const waiting = today.filter((entry) => entry.status === "WAITING");

  return {
    totalToday: today.length,
    waiting: waiting.length,
    emergencies: waiting.filter((entry) => entry.priority === "EMERGENCY").length,
    inConsultation: today.filter((entry) => entry.status === "IN_CONSULTATION").length,
    completedToday: completed.length,
    avgConsultMin,
    estWaitMin: Math.round(
      (waiting.length + today.filter((e) => e.status === "IN_CONSULTATION").length) * avgConsultMin,
    ),
  };
}
