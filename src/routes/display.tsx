import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Logo } from "@/components/brand/logo";
import { api } from "@/lib/api/client";

type DisplayEntry = Awaited<ReturnType<typeof api.queue.display>>["queue"][number];

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Queue Display · VitaFlow" },
      {
        name: "description",
        content:
          "Live public queue display for VitaFlow clinics — showing tokens now serving and next up.",
      },
    ],
  }),
  component: DisplayScreen,
});

function DisplayScreen() {
  const { data: queue = [] } = useQuery({
    queryKey: ["queue", "public-display"],
    queryFn: async () => (await api.queue.display()).queue,
    refetchInterval: 5000,
    staleTime: 0,
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const inConsult = queue.filter((e) => e.status === "IN_CONSULTATION");
  const waiting = queue.filter((e) => e.status === "WAITING");
  const nextUp = waiting.slice(0, 6);
  const emergency = waiting.find((e) => e.priority === "EMERGENCY");
  const emergencies = waiting.filter((e) => e.priority === "EMERGENCY").length;
  const avgConsultMin = 12;
  const estWaitMin = Math.round(waiting.length * avgConsultMin);

  return (
    <div className="min-h-screen bg-clinic-900 text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-clinic-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="ml-3 rounded-md border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
              Live display
            </span>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-bold tabular-nums tracking-tight">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
              {now.toLocaleDateString([], {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-8 py-8">
        {/* Emergency alert */}
        {emergency && (
          <div className="mb-8 flex items-center gap-4 rounded-3xl border border-emergency bg-emergency/20 px-6 py-4 text-emergency-foreground">
            <AlertTriangle className="size-6 animate-pulse text-emergency" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emergency">
                Emergency in queue
              </p>
              <p className="text-lg font-semibold">{emergency.token} — Please attend reception</p>
            </div>
          </div>
        )}

        {/* Now serving grid */}
        <section className="mb-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">
            Now serving
          </p>
          {inConsult.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-8 py-16 text-center">
              <p className="text-lg text-white/60">No consultations in progress.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {inConsult.map((e) => (
                <NowServingCard key={e.id} entry={e} />
              ))}
            </div>
          )}
        </section>

        {/* Next up + stats */}
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">
              Next up ({waiting.length} waiting)
            </p>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <ul className="divide-y divide-white/10">
                {nextUp.length === 0 && (
                  <li className="px-6 py-10 text-center text-white/50">Queue is empty.</li>
                )}
                {nextUp.map((e, idx) => (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between px-6 py-4 ${
                      e.priority === "EMERGENCY" ? "bg-emergency/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <span
                        className={`font-mono text-3xl font-bold tabular-nums ${
                          e.priority === "EMERGENCY" ? "text-emergency" : "text-white/90"
                        }`}
                      >
                        {e.token}
                      </span>
                      <div>
                        <p className="text-lg font-semibold">Next patient</p>
                        <p className="text-xs uppercase tracking-widest text-white/50">
                          {e.priority === "EMERGENCY" ? "Emergency" : `Position ${idx + 1}`}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-sm text-white/60">
                      ~{Math.round(idx * avgConsultMin)}m
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-4">
            <DisplayStat icon={Stethoscope} label="In consultation" value={inConsult.length} />
            <DisplayStat icon={Clock} label="Avg. consult" value={`${avgConsultMin}m`} />
            <DisplayStat
              icon={AlertTriangle}
              label="Emergencies waiting"
              value={emergencies}
              tone="emergency"
            />
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
                Estimated wait
              </p>
              <p className="mt-3 font-mono text-5xl font-bold tabular-nums">
                {estWaitMin}
                <span className="ml-2 text-lg text-white/50">min</span>
              </p>
              <p className="mt-2 text-xs text-white/60">For a routine patient joining now.</p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 px-8 py-4 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
        VitaFlow · Smart patient flow for school healthcare
      </footer>
    </div>
  );
}

function NowServingCard({ entry }: { entry: DisplayEntry }) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        entry.priority === "EMERGENCY"
          ? "border-emergency bg-emergency/10"
          : "border-white/15 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Token</p>
        {entry.priority === "EMERGENCY" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emergency px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emergency-foreground">
            <AlertTriangle className="size-3" />
            Urgent
          </span>
        )}
      </div>
      <p
        className={`mt-2 font-mono text-6xl font-bold tabular-nums ${
          entry.priority === "EMERGENCY" ? "text-emergency" : "text-white"
        }`}
      >
        {entry.token}
      </p>
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-lg font-semibold">Now serving</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-white/50">
          {entry.doctor?.fullName ?? "Doctor"} · {entry.room ?? "Consultation room"}
        </p>
      </div>
    </div>
  );
}

function DisplayStat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "default" | "emergency";
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-3xl border px-6 py-5 ${
        tone === "emergency" ? "border-emergency/50 bg-emergency/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">{label}</p>
        <p className="mt-2 font-mono text-3xl font-bold tabular-nums">{value}</p>
      </div>
      <Icon className={`size-6 ${tone === "emergency" ? "text-emergency" : "text-white/60"}`} />
    </div>
  );
}
