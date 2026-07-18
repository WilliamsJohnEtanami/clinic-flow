import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  LogOut,
  Loader2,
  Stethoscope,
  Ticket,
  UserPlus,
  XCircle,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";
import { useQueue, useWaitEstimate, useWaiting } from "@/lib/queue/hooks";
import { createEntry, setStatus } from "@/lib/queue/store";
import { formatDistanceToNowStrict } from "@/lib/utils/date";
import type { QueueEntry } from "@/lib/queue/types";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "Patient · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientHome,
});

const schema = z.object({
  reason: z.string().min(3, "Please describe your visit."),
  notes: z.string().optional(),
  emergency: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function PatientHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "patient") {
      navigate({ to: "/auth" });
    }
  }, [status, user, navigate]);

  const queue = useQueue();
  const waiting = useWaiting();
  const [confirmCancel, setConfirmCancel] = useState<QueueEntry | null>(null);

  // Find this user's ACTIVE entry (waiting or in consultation), most recent first
  const activeEntry = useMemo(() => {
    if (!user) return null;
    return (
      queue.find(
        (e) =>
          e.registeredBy === user.id &&
          (e.status === "waiting" || e.status === "in_consultation"),
      ) ?? null
    );
  }, [queue, user]);

  const history = useMemo(() => {
    if (!user) return [];
    return queue
      .filter(
        (e) =>
          e.registeredBy === user.id &&
          (e.status === "completed" || e.status === "cancelled"),
      )
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.createdAt).getTime() -
          new Date(a.completedAt ?? a.createdAt).getTime(),
      );
  }, [queue, user]);

  const position = useMemo(() => {
    if (!activeEntry) return 0;
    if (activeEntry.status === "in_consultation") return 0;
    const idx = waiting.findIndex((e) => e.id === activeEntry.id);
    return idx === -1 ? 0 : idx + 1;
  }, [activeEntry, waiting]);

  const waitMin = useWaitEstimate(activeEntry?.id);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.fullName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {ROLE_LABEL[user.role]}
                {user.matricNumber ? ` · ${user.matricNumber}` : ""}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/appointments">Appointments</Link>
            </Button>
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

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Patient Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Hello, {user.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Register a visit and watch your queue position update live.
          </p>
        </div>

        {activeEntry ? (
          <ActiveTokenCard
            entry={activeEntry}
            position={position}
            waitMin={waitMin}
            onCancel={() => setConfirmCancel(activeEntry)}
          />
        ) : (
          <SelfRegisterCard user={user} />
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Visit history
          </h2>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Stethoscope className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Your completed visits will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-clinic">
              {history.map((e) => (
                <li
                  key={e.id}
                  className="grid grid-cols-[110px_1fr_140px] items-center gap-4 px-5 py-4"
                >
                  <span
                    className={`font-mono text-sm font-bold ${
                      e.priority === "emergency" ? "text-emergency" : "text-primary"
                    }`}
                  >
                    {e.token}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{e.reason}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.doctorName ? `${e.doctorName} · ` : ""}
                      {new Date(e.completedAt ?? e.createdAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={`justify-self-end inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      e.status === "completed"
                        ? "bg-clinic-100 text-clinic-700"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your visit?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCancel &&
                `Token ${confirmCancel.token} will be removed from the queue. You'll need to register again if you change your mind.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my spot</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmCancel) return;
                setStatus(confirmCancel.id, "cancelled");
                toast.success(`Token ${confirmCancel.token} cancelled`);
                setConfirmCancel(null);
              }}
            >
              Cancel visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActiveTokenCard({
  entry,
  position,
  waitMin,
  onCancel,
}: {
  entry: QueueEntry;
  position: number;
  waitMin: number;
  onCancel: () => void;
}) {
  const inConsult = entry.status === "in_consultation";
  const isEmergency = entry.priority === "emergency";

  return (
    <section
      className={`rounded-3xl border p-8 shadow-clinic ${
        inConsult
          ? "border-success/40 bg-success-soft/40"
          : isEmergency
            ? "border-emergency/40 bg-emergency-soft/40"
            : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {inConsult ? "You're being seen" : "Your token"}
          </p>
          <p
            className={`mt-2 font-mono text-6xl font-bold tracking-tight ${
              isEmergency ? "text-emergency" : inConsult ? "text-success" : "text-primary"
            }`}
          >
            {entry.token}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {entry.reason}
            {isEmergency && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-emergency px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emergency-foreground">
                <AlertTriangle className="size-3" /> Emergency
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {inConsult ? (
            <>
              <Stat label="Doctor" value={entry.doctorName ?? "—"} />
              <Stat label="Room" value={entry.room ?? "—"} />
            </>
          ) : (
            <>
              <Stat label="Position" value={`#${position}`} />
              <Stat
                label="Est. wait"
                value={waitMin > 0 ? `${waitMin}m` : "Soon"}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
        <p className="font-mono text-xs text-muted-foreground">
          Registered {formatDistanceToNowStrict(entry.createdAt)} ago
          {entry.calledAt &&
            ` · called ${formatDistanceToNowStrict(entry.calledAt)} ago`}
        </p>
        {!inConsult && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <XCircle className="mr-2 size-4" /> Cancel visit
          </Button>
        )}
        {inConsult && (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="size-4" /> Please head to the consultation room.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold">{value}</p>
    </div>
  );
}

function SelfRegisterCard({
  user,
}: {
  user: { id: string; fullName: string; matricNumber?: string };
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", notes: "", emergency: false },
  });
  const emergency = watch("emergency");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const entry = createEntry({
        patientName: user.fullName,
        matricNumber: user.matricNumber,
        reason: values.reason,
        notes: values.notes,
        priority: values.emergency ? "emergency" : "routine",
        registeredBy: user.id,
      });
      toast.success(`Token ${entry.token} issued`, {
        description: `You're now in the ${
          values.emergency ? "emergency" : "routine"
        } queue.`,
      });
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to register.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-3xl border p-6 shadow-clinic transition ${
        emergency ? "border-emergency/60 ring-1 ring-emergency/30" : "border-border bg-card"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Register a visit</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You'll get a token instantly and can watch your position update live.
          </p>
        </div>
        <label
          htmlFor="patient-emergency"
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
            emergency
              ? "border-emergency bg-emergency text-emergency-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="size-3.5" />
          Emergency
          <Switch
            id="patient-emergency"
            checked={emergency}
            onCheckedChange={(v) => setValue("emergency", v)}
            aria-label="Mark as emergency"
          />
        </label>
      </div>

      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            Reason for visit
          </Label>
          <Input
            className="mt-1.5"
            placeholder="e.g. Headache, fever, follow-up"
            autoComplete="off"
            {...register("reason")}
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-destructive">{errors.reason.message}</p>
          )}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Symptoms / notes
            </Label>
            <span className="text-[10px] text-muted-foreground">Optional</span>
          </div>
          <Textarea
            className="mt-1.5"
            rows={3}
            placeholder="Describe onset, severity, or anything the doctor should know."
            {...register("notes")}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {emergency ? (
            <span className="inline-flex items-center gap-1 text-emergency">
              <AlertTriangle className="size-3.5" /> You'll be prioritised ahead of routine visits.
            </span>
          ) : (
            <>You'll be added to the end of the routine queue.</>
          )}
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 size-4" />
          )}
          Get my token <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <Clock className="size-3.5" />
        Only routine visits use FIFO. Genuine emergencies are always seen first — misuse is logged.
      </div>
    </form>
  );
}
