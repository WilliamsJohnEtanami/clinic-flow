import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LogOut,
  Stethoscope,
  Timer,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QueueTable } from "@/components/queue/queue-table";
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";
import { useMetrics, useQueue } from "@/lib/queue/hooks";
import { setStatus, updateEntry } from "@/lib/queue/store";
import { formatDistanceToNowStrict } from "@/lib/utils/date";
import type { QueueEntry } from "@/lib/queue/types";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DoctorHome,
});

const ROOM_KEY = "vitaflow.doctor.room";

function DoctorHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "doctor") {
      navigate({ to: "/auth" });
    }
  }, [status, user, navigate]);

  const queue = useQueue();
  const metrics = useMetrics();

  const [room, setRoom] = useState("Room 01");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(ROOM_KEY);
    if (saved) setRoom(saved);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ROOM_KEY, room);
  }, [room]);

  const [confirmComplete, setConfirmComplete] = useState<QueueEntry | null>(null);
  const [consultNotes, setConsultNotes] = useState("");

  // Currently in consultation with THIS doctor
  const currentPatient = useMemo(
    () =>
      queue.find(
        (e) => e.status === "in_consultation" && e.doctorId === user?.id,
      ) ?? null,
    [queue, user?.id],
  );

  // Waiting list (emergency first via store ordering)
  const waiting = useMemo(
    () => queue.filter((e) => e.status === "waiting"),
    [queue],
  );

  // Completed today by this doctor
  const completedByMe = useMemo(
    () =>
      queue.filter(
        (e) => e.status === "completed" && e.doctorId === user?.id,
      ),
    [queue, user?.id],
  );

  const nextInLine = waiting[0] ?? null;

  useEffect(() => {
    setConsultNotes(currentPatient?.notes ?? "");
  }, [currentPatient?.id]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const callPatient = (entry: QueueEntry) => {
    if (currentPatient) {
      toast.error("Finish the current consultation first.");
      return;
    }
    setStatus(entry.id, "in_consultation", {
      doctorId: user.id,
      doctorName: user.fullName,
      room,
    });
    toast.success(`Called ${entry.token} · ${entry.patientName}`, {
      description: `${room} · ${user.fullName}`,
    });
  };

  const completeConsult = () => {
    if (!confirmComplete) return;
    // Persist any note edits before completing
    if (consultNotes !== (confirmComplete.notes ?? "")) {
      updateEntry(confirmComplete.id, { notes: consultNotes });
    }
    setStatus(confirmComplete.id, "completed");
    toast.success(`Consultation complete · ${confirmComplete.token}`);
    setConfirmComplete(null);
    setConsultNotes("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.fullName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {ROLE_LABEL[user.role]}
                {user.specialty ? ` · ${user.specialty}` : ""}
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Label htmlFor="doctor-room" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Room
              </Label>
              <Input
                id="doctor-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="h-8 w-28"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Doctor Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {currentPatient ? "In consultation" : nextInLine ? "Ready for next patient" : "All clear"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Emergencies always jump ahead of routine visits, but consultations in progress are never interrupted.
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat
            label="Waiting"
            value={metrics.waiting}
            icon={ClipboardList}
            tone="muted"
          />
          <MiniStat
            label="Emergencies"
            value={metrics.emergencies}
            icon={ClipboardList}
            tone="emergency"
          />
          <MiniStat
            label="Avg consult"
            value={`${metrics.avgConsultMin}m`}
            icon={Timer}
            tone="primary"
          />
          <MiniStat
            label="Seen today"
            value={completedByMe.length}
            icon={CheckCircle2}
            tone="success"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Current consultation */}
          <section
            className={`rounded-2xl border p-6 shadow-clinic ${
              currentPatient
                ? "border-success/40 bg-success-soft/30"
                : "border-dashed border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Now serving
                </p>
                {currentPatient ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-3xl font-bold text-success">
                        {currentPatient.token}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          currentPatient.priority === "emergency"
                            ? "bg-emergency text-emergency-foreground"
                            : "bg-clinic-100 text-clinic-700"
                        }`}
                      >
                        {currentPatient.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold">
                      {currentPatient.patientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentPatient.matricNumber
                        ? `${currentPatient.matricNumber} · `
                        : ""}
                      {currentPatient.reason}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Called {formatDistanceToNowStrict(currentPatient.calledAt ?? currentPatient.createdAt)} ago · {currentPatient.room ?? room}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No patient in your room. Call the next patient from the queue on the right.
                  </p>
                )}
              </div>
              {currentPatient && (
                <Stethoscope className="size-8 shrink-0 text-success" />
              )}
            </div>

            {currentPatient && (
              <div className="mt-5 space-y-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Consultation notes
                  </Label>
                  <Textarea
                    value={consultNotes}
                    onChange={(e) => setConsultNotes(e.target.value)}
                    rows={4}
                    placeholder="Diagnosis, prescription, follow-up…"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateEntry(currentPatient.id, { notes: consultNotes });
                      toast.success("Notes saved");
                    }}
                  >
                    Save notes
                  </Button>
                  <Button onClick={() => setConfirmComplete(currentPatient)}>
                    <CheckCircle2 className="mr-2 size-4" /> Complete consultation
                  </Button>
                </div>
              </div>
            )}

            {!currentPatient && nextInLine && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Next up
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`font-mono text-xl font-bold ${
                          nextInLine.priority === "emergency"
                            ? "text-emergency"
                            : "text-primary"
                        }`}
                      >
                        {nextInLine.token}
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {nextInLine.patientName}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {nextInLine.reason}
                    </p>
                  </div>
                  <Button onClick={() => callPatient(nextInLine)}>
                    Call <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Waiting queue */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Waiting queue
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {waiting.length} patient{waiting.length === 1 ? "" : "s"}
              </span>
            </div>
            <QueueTable
              entries={waiting}
              onCall={(entry) => callPatient(entry)}
              emptyLabel="No one is waiting. Nice work."
            />
          </section>
        </div>

        {/* Today's history */}
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Seen today
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {completedByMe.length} completed
            </span>
          </div>
          {completedByMe.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <UserCircle2 className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Completed consultations will appear here.
              </p>
            </div>
          ) : (
            <QueueTable entries={completedByMe} />
          )}
        </section>
      </main>

      <AlertDialog
        open={!!confirmComplete}
        onOpenChange={(o) => !o && setConfirmComplete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmComplete &&
                `${confirmComplete.token} · ${confirmComplete.patientName} will be marked completed and removed from the active queue.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction onClick={completeConsult}>
              Mark completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "muted" | "emergency" | "success";
}) {
  const toneClass: Record<typeof tone, string> = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    emergency: "text-emergency",
    success: "text-success",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-clinic">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className={`size-4 ${toneClass[tone]}`} />
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
