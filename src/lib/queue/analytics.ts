/**
 * Queue analytics computations.
 * Provides data for admin dashboards: throughput trends, wait-time histograms,
 * no-show rates, doctor utilization, and CSV export.
 */
import type { QueueEntry } from "./types";

export interface ThroughputDataPoint {
  hour: string;
  completed: number;
  timestamp: number;
}

export interface WaitTimePoint {
  range: string;
  count: number;
  percentage: number;
}

export interface DoctorStats {
  doctorName: string;
  cases: number;
  avgConsultMin: number;
  utilization: number; // percentage of time spent consulting
}

export interface AnalyticsSummary {
  period: "today" | "week" | "month";
  totalProcessed: number;
  totalCancelled: number;
  noShowRate: number; // percentage
  totalWaitTimeSum: number; // minutes
  avgWaitTime: number; // minutes
  avgConsultTime: number; // minutes
  emergenciesHandled: number;
  doctorCount: number;
}

/**
 * Get start-of-day timestamp (00:00:00)
 */
function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start-of-week timestamp (Monday 00:00:00)
 */
function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start-of-month timestamp (1st at 00:00:00)
 */
function getStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodStart(period: "today" | "week" | "month"): Date {
  if (period === "today") return getStartOfDay();
  if (period === "week") return getStartOfWeek();
  return getStartOfMonth();
}

/**
 * Throughput trend: completed entries per hour for a period
 */
export function getThroughputTrend(
  entries: QueueEntry[],
  period: "today" | "week" | "month" = "today",
): ThroughputDataPoint[] {
  const periodStart = getPeriodStart(period);
  const now = new Date();
  const filtered = entries.filter((e) => {
    const created = new Date(e.createdAt);
    return created >= periodStart && created <= now && e.status === "COMPLETED";
  });

  const hourBuckets: Record<number, number> = {};

  for (const entry of filtered) {
    if (!entry.consultationEndAt) continue;
    const completedTime = new Date(entry.consultationEndAt);
    const hourKey = new Date(completedTime).setMinutes(0, 0, 0);
    hourBuckets[hourKey] = (hourBuckets[hourKey] ?? 0) + 1;
  }

  // Fill in empty hours for contiguous timeline
  const buckets: ThroughputDataPoint[] = [];
  const start = new Date(periodStart);
  const end = new Date(now);

  for (let d = new Date(start); d <= end; d.setHours(d.getHours() + 1)) {
    const key = new Date(d).setMinutes(0, 0, 0);
    buckets.push({
      hour: d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      completed: hourBuckets[key] ?? 0,
      timestamp: key,
    });
  }

  return buckets;
}

/**
 * Wait-time histogram: distribution of actual wait times (createdAt → calledAt)
 */
export function getWaitTimeHistogram(entries: QueueEntry[]): WaitTimePoint[] {
  const waitTimes = entries
    .filter((e) => e.calledAt && e.registeredAt)
    .map((e) => {
      const waitMs = new Date(e.calledAt!).getTime() - new Date(e.registeredAt).getTime();
      return Math.round(waitMs / 60_000); // minutes
    })
    .filter((m) => m >= 0);

  if (waitTimes.length === 0) {
    return [
      { range: "0-5 min", count: 0, percentage: 0 },
      { range: "5-10 min", count: 0, percentage: 0 },
      { range: "10-15 min", count: 0, percentage: 0 },
      { range: "15-30 min", count: 0, percentage: 0 },
      { range: ">30 min", count: 0, percentage: 0 },
    ];
  }

  const buckets = {
    "0-5": waitTimes.filter((m) => m < 5).length,
    "5-10": waitTimes.filter((m) => m >= 5 && m < 10).length,
    "10-15": waitTimes.filter((m) => m >= 10 && m < 15).length,
    "15-30": waitTimes.filter((m) => m >= 15 && m < 30).length,
    "30+": waitTimes.filter((m) => m >= 30).length,
  };

  const total = waitTimes.length;
  return [
    {
      range: "0-5 min",
      count: buckets["0-5"],
      percentage: Math.round((buckets["0-5"] / total) * 100),
    },
    {
      range: "5-10 min",
      count: buckets["5-10"],
      percentage: Math.round((buckets["5-10"] / total) * 100),
    },
    {
      range: "10-15 min",
      count: buckets["10-15"],
      percentage: Math.round((buckets["10-15"] / total) * 100),
    },
    {
      range: "15-30 min",
      count: buckets["15-30"],
      percentage: Math.round((buckets["15-30"] / total) * 100),
    },
    {
      range: ">30 min",
      count: buckets["30+"],
      percentage: Math.round((buckets["30+"] / total) * 100),
    },
  ];
}

/**
 * No-show rate: cancelled entries / total entries for a period
 */
export function getNoShowRate(
  entries: QueueEntry[],
  period: "today" | "week" | "month" = "today",
): number {
  const periodStart = getPeriodStart(period);
  const now = new Date();
  const filtered = entries.filter((e) => {
    const created = new Date(e.registeredAt);
    return created >= periodStart && created <= now;
  });

  if (filtered.length === 0) return 0;
  const cancelled = filtered.filter((e) => e.status === "NO_SHOW").length;
  return Math.round((cancelled / filtered.length) * 100);
}

/**
 * Doctor utilization: cases and avg consultation time per doctor
 */
export function getDoctorUtilization(entries: QueueEntry[]): DoctorStats[] {
  const doctorMap: Record<string, { cases: number; durations: number[] }> = {};

  for (const entry of entries) {
    const doctorName = entry.doctor?.fullName;
    if (!doctorName) continue;
    if (!doctorMap[doctorName]) {
      doctorMap[doctorName] = { cases: 0, durations: [] };
    }
    doctorMap[doctorName].cases += 1;

    if (entry.consultationStartAt && entry.consultationEndAt) {
      const durationMin =
        (new Date(entry.consultationEndAt).getTime() -
          new Date(entry.consultationStartAt).getTime()) /
        60_000;
      if (durationMin > 0) {
        doctorMap[entry.doctorName].durations.push(durationMin);
      }
    }
  }

  return Object.entries(doctorMap)
    .map(([doctorName, data]) => ({
      doctorName,
      cases: data.cases,
      avgConsultMin: data.durations.length
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
      utilization: 0,
    }))
    .sort((a, b) => b.cases - a.cases);
}

/**
 * Summary statistics for a period
 */
export function getAnalyticsSummary(
  entries: QueueEntry[],
  period: "today" | "week" | "month" = "today",
): AnalyticsSummary {
  const periodStart = getPeriodStart(period);
  const now = new Date();
  const filtered = entries.filter((e) => {
    const created = new Date(e.registeredAt);
    return created >= periodStart && created <= now;
  });

  const completed = filtered.filter((e) => e.status === "COMPLETED");
  const cancelled = filtered.filter((e) => e.status === "CANCELLED");
  const noShows = filtered.filter((e) => e.status === "NO_SHOW");
  const emergencies = completed.filter((e) => e.priority === "EMERGENCY");

  const waitTimes = completed
    .filter((e) => e.calledAt && e.registeredAt)
    .map((e) => {
      const waitMs = new Date(e.calledAt!).getTime() - new Date(e.registeredAt).getTime();
      return Math.round(waitMs / 60_000);
    })
    .filter((m) => m >= 0);

  const consultTimes = completed
    .filter((e) => e.consultationStartAt && e.consultationEndAt)
    .map((e) => {
      const consultMs =
        new Date(e.consultationEndAt!).getTime() - new Date(e.consultationStartAt!).getTime();
      return Math.round(consultMs / 60_000);
    })
    .filter((m) => m > 0);

  const avgWait = waitTimes.length
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 0;
  const avgConsult = consultTimes.length
    ? Math.round(consultTimes.reduce((a, b) => a + b, 0) / consultTimes.length)
    : 0;
  const totalWaitSum = waitTimes.reduce((a, b) => a + b, 0);

  const doctors = new Set<string>();
  for (const entry of filtered) {
    if (entry.doctor?.fullName) doctors.add(entry.doctor.fullName);
  }

  return {
    period,
    totalProcessed: completed.length,
    totalCancelled: cancelled.length,
    noShowRate: filtered.length > 0 ? Math.round((noShows.length / filtered.length) * 100) : 0,
    totalWaitTimeSum: totalWaitSum,
    avgWaitTime: avgWait,
    avgConsultTime: avgConsult,
    emergenciesHandled: emergencies.length,
    doctorCount: doctors.size,
  };
}

/**
 * CSV export: all entries for a period with computed metrics
 */
export function exportToCSV(
  entries: QueueEntry[],
  period: "today" | "week" | "month" = "today",
): string {
  const periodStart = getPeriodStart(period);
  const now = new Date();
  const filtered = entries.filter((e) => {
    const created = new Date(e.registeredAt);
    return created >= periodStart && created <= now;
  });

  const headers = [
    "Token",
    "Patient Name",
    "Matric Number",
    "Priority",
    "Status",
    "Doctor",
    "Room",
    "Reason",
    "Created At",
    "Called At",
    "Completed At",
    "Wait Time (min)",
    "Consult Time (min)",
    "Notes",
  ];

  const rows = filtered.map((e) => {
    const waitTime =
      e.calledAt && e.registeredAt
        ? Math.round((new Date(e.calledAt).getTime() - new Date(e.registeredAt).getTime()) / 60_000)
        : "";
    const consultTime =
      e.consultationStartAt && e.consultationEndAt
        ? Math.round(
            (new Date(e.consultationEndAt).getTime() - new Date(e.consultationStartAt).getTime()) /
              60_000,
          )
        : "";

    return [
      e.token,
      `"${e.patient.fullName.replace(/"/g, '""')}"`,
      e.patient.matricNumber || "",
      e.priority,
      e.status,
      e.doctor?.fullName || "",
      e.room || "",
      `"${e.reason}"`,
      new Date(e.registeredAt).toLocaleString(),
      e.calledAt ? new Date(e.calledAt).toLocaleString() : "",
      e.consultationEndAt ? new Date(e.consultationEndAt).toLocaleString() : "",
      waitTime,
      consultTime,
      e.notes ? `"${e.notes.replace(/"/g, '""')}"` : "",
    ];
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return csv;
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(
  entries: QueueEntry[],
  period: "today" | "week" | "month" = "today",
): void {
  const csv = exportToCSV(entries, period);
  const filename = `vitaflow-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
