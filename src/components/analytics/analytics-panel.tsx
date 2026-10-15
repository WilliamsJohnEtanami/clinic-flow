import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsSummaryCard } from "./analytics-summary-card";
import { ThroughputChart } from "./throughput-chart";
import { WaitTimeHistogram } from "./wait-time-histogram";
import { DoctorUtilizationChart } from "./doctor-utilization-chart";
import {
  useThroughputTrend,
  useWaitTimeHistogram,
  useDoctorUtilization,
  useAnalyticsSummary,
} from "@/lib/queue/analytics-hooks";
import { downloadCSV } from "@/lib/queue/analytics";
import { useQueueList } from "@/lib/queue/api-hooks";
import { toast } from "sonner";

type Period = "today" | "week" | "month";

interface AnalyticsPanelProps {
  initialPeriod?: Period;
}

export function AnalyticsPanel({ initialPeriod = "today" }: AnalyticsPanelProps) {
  const { data: queue = [] } = useQueueList();
  const throughputData = useThroughputTrend(initialPeriod);
  const waitTimeData = useWaitTimeHistogram();
  const doctorData = useDoctorUtilization();
  const summary = useAnalyticsSummary(initialPeriod);

  const handleExportCSV = () => {
    try {
      downloadCSV(queue, initialPeriod);
      toast.success(`Exported ${initialPeriod} report`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Overview</h2>
            <p className="text-xs text-muted-foreground">Key metrics for {initialPeriod}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>
        <AnalyticsSummaryCard summary={summary} />
      </div>

      {/* Charts */}
      <Tabs defaultValue="throughput" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="waittime">Wait Time</TabsTrigger>
          <TabsTrigger value="doctors">Doctor Utilization</TabsTrigger>
        </TabsList>

        <TabsContent value="throughput" className="mt-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Completions by hour</h3>
            <ThroughputChart data={throughputData} period={initialPeriod} />
          </div>
        </TabsContent>

        <TabsContent value="waittime" className="mt-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Patient wait time distribution</h3>
            <WaitTimeHistogram data={waitTimeData} />
            <div className="mt-4 grid grid-cols-5 gap-2">
              {waitTimeData.map((point) => (
                <div
                  key={point.range}
                  className="rounded-lg border border-border bg-card p-2 text-center"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground">{point.range}</p>
                  <p className="text-sm font-bold mt-1">{point.percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="doctors" className="mt-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Doctor performance</h3>
            <DoctorUtilizationChart data={doctorData} />
            {doctorData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-semibold">Doctor</th>
                      <th className="text-right py-2 px-3 font-semibold">Cases</th>
                      <th className="text-right py-2 px-3 font-semibold">Avg Consult (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorData.map((doctor) => (
                      <tr key={doctor.doctorName} className="border-b border-border/50">
                        <td className="py-2 px-3">{doctor.doctorName}</td>
                        <td className="text-right py-2 px-3">{doctor.cases}</td>
                        <td className="text-right py-2 px-3">{doctor.avgConsultMin}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
