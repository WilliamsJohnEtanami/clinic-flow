/**
 * Analytics hooks for admin dashboard.
 * Memoized computations using the current queue snapshot.
 */
import { useMemo } from "react";
import { useQueueList } from "./api-hooks";
import {
  getAnalyticsSummary,
  getDoctorUtilization,
  getNoShowRate,
  getThroughputTrend,
  getWaitTimeHistogram,
  type AnalyticsSummary,
  type DoctorStats,
  type ThroughputDataPoint,
  type WaitTimePoint,
} from "./analytics";

export function useThroughputTrend(
  period: "today" | "week" | "month" = "today",
): ThroughputDataPoint[] {
  const { data: queue = [] } = useQueueList();
  return useMemo(() => getThroughputTrend(queue, period), [queue, period]);
}

export function useWaitTimeHistogram(): WaitTimePoint[] {
  const { data: queue = [] } = useQueueList();
  return useMemo(() => getWaitTimeHistogram(queue), [queue]);
}

export function useNoShowRate(period: "today" | "week" | "month" = "today"): number {
  const { data: queue = [] } = useQueueList();
  return useMemo(() => getNoShowRate(queue, period), [queue, period]);
}

export function useDoctorUtilization(): DoctorStats[] {
  const { data: queue = [] } = useQueueList();
  return useMemo(() => getDoctorUtilization(queue), [queue]);
}

export function useAnalyticsSummary(
  period: "today" | "week" | "month" = "today",
): AnalyticsSummary {
  const { data: queue = [] } = useQueueList();
  return useMemo(() => getAnalyticsSummary(queue, period), [queue, period]);
}
