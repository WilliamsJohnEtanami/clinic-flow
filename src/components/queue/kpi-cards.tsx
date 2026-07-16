import { AlertTriangle, Clock, ListChecks, Stethoscope, Users } from "lucide-react";
import type { QueueMetrics } from "@/lib/queue/store";

export function KpiCards({ metrics }: { metrics: QueueMetrics }) {
  const cards = [
    {
      label: "Registered today",
      value: metrics.totalToday,
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Waiting",
      value: metrics.waiting,
      icon: ListChecks,
      tone: "muted" as const,
    },
    {
      label: "Emergency",
      value: metrics.emergencies,
      icon: AlertTriangle,
      tone: "emergency" as const,
    },
    {
      label: "In consultation",
      value: metrics.inConsultation,
      icon: Stethoscope,
      tone: "success" as const,
    },
    {
      label: "Avg. consult",
      value: `${metrics.avgConsultMin}m`,
      icon: Clock,
      tone: "muted" as const,
    },
    {
      label: "Est. next wait",
      value: `${metrics.estWaitMin}m`,
      icon: Clock,
      tone: "primary" as const,
    },
  ];

  const toneRing: Record<"primary" | "muted" | "emergency" | "success", string> = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    emergency: "text-emergency",
    success: "text-success",
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-border bg-card p-4 shadow-clinic"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {c.label}
            </p>
            <c.icon className={`size-4 ${toneRing[c.tone]}`} />
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
