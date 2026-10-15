import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DoctorStats } from "@/lib/queue/analytics";

interface DoctorUtilizationChartProps {
  data: DoctorStats[];
}

export function DoctorUtilizationChart({ data }: DoctorUtilizationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="doctorName" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
            }}
          />
          <Legend />
          <Bar dataKey="cases" fill="hsl(var(--primary))" name="Cases" />
          <Bar dataKey="avgConsultMin" fill="hsl(var(--secondary))" name="Avg Consult (min)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
