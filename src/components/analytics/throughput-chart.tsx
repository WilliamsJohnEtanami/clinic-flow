import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ThroughputDataPoint } from "@/lib/queue/analytics";

interface ThroughputChartProps {
  data: ThroughputDataPoint[];
  period?: "today" | "week" | "month";
}

export function ThroughputChart({ data, period = "today" }: ThroughputChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const tickCount =
    period === "today" ? data.length : Math.min(7, Math.max(3, Math.floor(data.length / 4)));

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            interval={Math.max(0, Math.floor(data.length / tickCount) - 1)}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="hsl(var(--primary))"
            name="Completed"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
