import { AlertTriangle, Clock, Users, CheckCircle2, Zap } from "lucide-react";
import type { AnalyticsSummary } from "@/lib/queue/analytics";

interface AnalyticsSummaryCardProps {
  summary: AnalyticsSummary;
}

export function AnalyticsSummaryCard({ summary }: AnalyticsSummaryCardProps) {
  const cards = [
    {
      label: "Processed today",
      value: summary.totalProcessed,
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Avg wait time",
      value: `${summary.avgWaitTime}m`,
      icon: Clock,
      tone: "primary",
    },
    {
      label: "Avg consultation",
      value: `${summary.avgConsultTime}m`,
      icon: Zap,
      tone: "secondary",
    },
    {
      label: "No-show rate",
      value: `${summary.noShowRate}%`,
      icon: AlertTriangle,
      tone: "muted",
    },
    {
      label: "Emergencies handled",
      value: summary.emergenciesHandled,
      icon: AlertTriangle,
      tone: "emergency",
    },
    {
      label: "Doctors on duty",
      value: summary.doctorCount,
      icon: Users,
      tone: "primary",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="size-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground truncate">{card.label}</p>
            </div>
            <p className="text-lg font-bold tracking-tight">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
