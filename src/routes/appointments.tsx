import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, LogIn, Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth/types";
import {
  useAppointmentsList,
  useCancelAppointment,
  useCreateAppointment,
  useUpdateAppointmentStatus,
} from "@/lib/appointments/api-hooks";
import { useCreateFromAppointment } from "@/lib/queue/api-hooks";
import type { Appointment, AppointmentStatus } from "@/lib/appointments/types";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [{ title: "Appointments · VitaFlow" }, { name: "robots", content: "noindex" }],
  }),
  component: AppointmentsPage,
});

type Filter = "upcoming" | "today" | "past" | "all";

function AppointmentsPage() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
  }, [status, navigate]);

  const { data: all = [], isLoading, error } = useAppointmentsList();
  const createFromAppointment = useCreateFromAppointment();
  const cancelMutation = useCancelAppointment();
  const statusMutation = useUpdateAppointmentStatus();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null);

  const scoped = useMemo(() => {
    if (!user) return [];
    return all;
  }, [all, user]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    let list = scoped;
    if (filter === "upcoming")
      list = list.filter(
        (a) =>
          new Date(a.scheduledFor) >= now &&
          (a.status === "scheduled" || a.status === "checked_in"),
      );
    else if (filter === "today")
      list = list.filter(
        (a) => new Date(a.scheduledFor) >= startOfDay && new Date(a.scheduledFor) <= endOfDay,
      );
    else if (filter === "past")
      list = list.filter(
        (a) =>
          new Date(a.scheduledFor) < startOfDay ||
          a.status === "completed" ||
          a.status === "cancelled" ||
          a.status === "no_show",
      );
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          (a.matricNumber ?? "").toLowerCase().includes(q) ||
          (a.doctorName ?? "").toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q),
      );
    }
    return list;
  }, [scoped, filter, search]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const canBook = user.role === "receptionist" || user.role === "admin" || user.role === "patient";
  const canCheckIn = user.role === "receptionist" || user.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              to={ROLE_HOME[user.role] as "/admin"}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <Logo />
            <div className="hidden sm:block">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Appointments
              </p>
              <p className="text-sm font-semibold text-foreground">{ROLE_LABEL[user.role]} view</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canBook && (
              <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Book
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Booking form */}
        {showForm && canBook && (
          <div className="mb-6 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">New appointment</h2>
                <p className="text-xs text-muted-foreground">
                  Book a scheduled visit — it will appear in the doctor's day view and can be
                  checked in on arrival.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BookForm
              defaultPatientName={user.role === "patient" ? user.fullName : ""}
              defaultMatric={user.role === "patient" ? (user.matricNumber ?? "") : ""}
              isPatient={user.role === "patient"}
              onCreated={() => {
                setShowForm(false);
                toast.success("Appointment booked");
              }}
            />
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="w-full sm:w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, matric, doctor, reason…"
            />
          </div>
        </div>

        {/* List */}
        <div className="rounded-xl border border-border/70 bg-card">
          <div className="grid grid-cols-12 gap-3 border-b border-border/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">When</div>
            <div className="col-span-3">Patient</div>
            <div className="col-span-3">Reason</div>
            <div className="col-span-1">Doctor</div>
            <div className="col-span-2 text-right">Status · Actions</div>
          </div>
          {error ? (
            <p role="alert" className="p-5 text-sm text-destructive">
              Could not load appointments: {error.message}
            </p>
          ) : isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Loading appointments…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
              <CalendarClock className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No appointments here</p>
              <p className="text-xs text-muted-foreground">
                {canBook
                  ? "Book one to see it appear in the list."
                  : "Nothing scheduled for this view."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((a) => (
                <ApptRow
                  key={a.id}
                  appt={a}
                  canCheckIn={canCheckIn}
                  onCheckIn={async () => {
                    try {
                      await createFromAppointment.mutateAsync(a.id);
                      toast.success(`${a.patientName} checked in`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Unable to check in");
                    }
                  }}
                  onCancel={() => setConfirmCancel(a)}
                  onNoShow={async () => {
                    try {
                      await statusMutation.mutateAsync({ id: a.id, status: "NO_SHOW" });
                      toast.message(`Marked ${a.patientName} as no-show`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Unable to mark no-show");
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      <AlertDialog open={!!confirmCancel} onOpenChange={(open) => !open && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCancel &&
                `${confirmCancel.patientName} · ${formatWhen(confirmCancel.scheduledFor)}. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmCancel) return;
                void cancelMutation
                  .mutateAsync({ id: confirmCancel.id })
                  .then(() => {
                    toast.success("Appointment cancelled");
                    setConfirmCancel(null);
                  })
                  .catch((err: unknown) => {
                    toast.error(
                      err instanceof Error ? err.message : "Unable to cancel appointment",
                    );
                  });
              }}
            >
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- row --------------------------------------------------------------

function ApptRow({
  appt,
  canCheckIn,
  onCheckIn,
  onCancel,
  onNoShow,
}: {
  appt: Appointment;
  canCheckIn: boolean;
  onCheckIn: () => void;
  onCancel: () => void;
  onNoShow: () => void;
}) {
  const isPast = new Date(appt.scheduledFor) < new Date();
  const active = appt.status === "scheduled" || appt.status === "checked_in";

  return (
    <li className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm">
      <div className="col-span-3">
        <div className="font-mono text-[13px] font-semibold text-foreground">
          {formatWhen(appt.scheduledFor)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {appt.durationMin} min
          {isPast && active ? " · overdue" : ""}
        </div>
      </div>
      <div className="col-span-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clinic-100 text-[11px] font-semibold text-clinic-700">
            {initials(appt.patientName)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{appt.patientName}</div>
            {appt.matricNumber && (
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {appt.matricNumber}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-3">
        <div className="truncate text-foreground">{appt.reason}</div>
        {appt.notes && (
          <div className="truncate text-[11px] text-muted-foreground">{appt.notes}</div>
        )}
      </div>
      <div className="col-span-1">
        <div className="truncate text-[13px] text-foreground">{appt.doctorName ?? "—"}</div>
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        <StatusPill status={appt.status} />
        {canCheckIn && appt.status === "scheduled" && (
          <Button size="sm" variant="secondary" className="h-7 gap-1" onClick={onCheckIn}>
            <LogIn className="h-3.5 w-3.5" />
            Check in
          </Button>
        )}
        {active && (
          <div className="flex items-center gap-1">
            {canCheckIn && appt.status === "scheduled" && isPast && (
              <button
                onClick={onNoShow}
                className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                title="Mark no-show"
              >
                No-show
              </button>
            )}
            <button
              onClick={onCancel}
              className="rounded-md px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
              title="Cancel"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  const styles: Record<AppointmentStatus, string> = {
    scheduled: "bg-clinic-50 text-clinic-700 border-clinic-200",
    checked_in: "bg-success/10 text-success border-success/30",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-muted text-muted-foreground border-border",
    no_show: "bg-destructive/10 text-destructive border-destructive/30",
  };
  const labels: Record<AppointmentStatus, string> = {
    scheduled: "Scheduled",
    checked_in: "Checked in",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}
    >
      {status === "checked_in" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {labels[status]}
    </span>
  );
}

// ---- booking form -----------------------------------------------------

function BookForm({
  defaultPatientName,
  defaultMatric,
  isPatient,
  onCreated,
}: {
  defaultPatientName: string;
  defaultMatric: string;
  isPatient: boolean;
  onCreated: () => void;
}) {
  const [patientName, setPatientName] = useState(defaultPatientName);
  const [matric, setMatric] = useState(defaultMatric);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("20");
  const [notes, setNotes] = useState("");
  const createAppointment = useCreateAppointment();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !reason.trim()) {
      toast.error("Patient name and reason are required");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      toast.error("Invalid date or time");
      return;
    }
    const iso = scheduledAt.toISOString();
    try {
      await createAppointment.mutateAsync({
        patientName: patientName.trim(),
        matricNumber: matric.trim() || undefined,
        phone: isPatient ? undefined : phone.trim() || undefined,
        reason: reason.trim(),
        scheduledFor: iso,
        durationMin: Number(duration) || 20,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not book appointment");
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="pn">Patient name</Label>
        <Input
          id="pn"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Full name"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mn">Matric / ID</Label>
        <Input
          id="mn"
          value={matric}
          onChange={(e) => setMatric(e.target.value)}
          placeholder="e.g. CSC/2022/031"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ph">Phone</Label>
        <Input
          id="ph"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="flex items-end text-xs text-muted-foreground">
        Doctor assignment is handled by the clinic when the appointment is reviewed.
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dt">Date</Label>
        <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tm">Time</Label>
          <Input id="tm" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dur">Duration (min)</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger id="dur">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "15", "20", "30", "45", "60"].map((n) => (
                <SelectItem key={n} value={n}>
                  {n} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="rs">Reason for visit</Label>
        <Input
          id="rs"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Annual physical"
          required
        />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="nt">Notes (optional)</Label>
        <Textarea
          id="nt"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Symptoms, prep instructions…"
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={createAppointment.isPending} className="gap-1.5">
          <UserRound className="h-4 w-4" />
          Book appointment
        </Button>
      </div>
    </form>
  );
}

// ---- utils ------------------------------------------------------------

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  )
    return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
