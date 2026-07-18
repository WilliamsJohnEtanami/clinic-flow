import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LogOut,
  Monitor,
  RefreshCw,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueueTable } from "@/components/queue/queue-table";
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL, type Role } from "@/lib/auth/types";
import {
  countByRole,
  createStaff,
  deleteUser,
  listUsers,
} from "@/lib/auth/admin";
import { useQueue, useMetrics } from "@/lib/queue/hooks";
import { resetQueue } from "@/lib/queue/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "admin") {
      navigate({ to: "/auth" });
    }
  }, [status, user, navigate]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <AdminConsole userName={user.fullName} onSignOut={async () => {
    await signOut();
    navigate({ to: "/" });
  }} />;
}

function AdminConsole({ userName, onSignOut }: { userName: string; onSignOut: () => void }) {
  const queue = useQueue();
  const metrics = useMetrics();
  const [staffTick, setStaffTick] = useState(0);
  const users = useMemo(() => listUsers(), [staffTick]);
  const roleCounts = useMemo(() => countByRole(), [staffTick]);

  const emergencyToday = queue.filter((e) => e.priority === "emergency").length;
  const throughput = metrics.completedToday;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              to="/display"
              className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              <Monitor className="size-3.5" /> Open display
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Administrator
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Administrator
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Clinic operations</h1>
            <p className="mt-2 text-muted-foreground">
              Staff, throughput and live queue — everything at a glance.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetQueue();
              toast.success("Demo queue reset");
            }}
          >
            <RefreshCw className="mr-2 size-4" /> Reset demo data
          </Button>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Registered today"
            value={metrics.totalToday}
            icon={Users}
            tone="primary"
          />
          <StatCard
            label="Completed"
            value={throughput}
            icon={Activity}
            tone="success"
          />
          <StatCard
            label="Emergencies"
            value={emergencyToday}
            icon={AlertTriangle}
            tone="emergency"
          />
          <StatCard
            label="Avg. consult"
            value={`${metrics.avgConsultMin}m`}
            icon={BarChart3}
            tone="muted"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Live queue */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Live queue</h2>
                <p className="text-xs text-muted-foreground">
                  Read-only overview — actions happen at reception and consultation.
                </p>
              </div>
              <Link
                to="/reception"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open reception →
              </Link>
            </div>
            <QueueTable entries={queue} hideResolved emptyLabel="Queue is empty." />
          </section>

          {/* Staff */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Staff & accounts</h2>
                <p className="text-xs text-muted-foreground">
                  {roleCounts.doctor} doctors · {roleCounts.receptionist} receptionists ·{" "}
                  {roleCounts.patient} patients
                </p>
              </div>
            </div>
            <StaffCreateForm onCreated={() => setStaffTick((t) => t + 1)} />
            <StaffList
              users={users}
              onDelete={(id) => {
                deleteUser(id);
                setStaffTick((t) => t + 1);
                toast.success("Account removed");
              }}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatCard({
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

function StaffCreateForm({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"doctor" | "receptionist" | "admin">("doctor");
  const [specialty, setSpecialty] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      createStaff({
        fullName,
        email,
        password,
        role,
        specialty: role === "doctor" ? specialty : undefined,
      });
      toast.success(`${ROLE_LABEL[role]} added`, { description: email });
      setFullName("");
      setEmail("");
      setPassword("");
      setSpecialty("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-clinic"
    >
      <div className="mb-4 flex items-center gap-2">
        <UserPlus className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Add staff account</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider">Full name</Label>
          <Input
            className="mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Dr. Jane Smith"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="receptionist">Receptionist</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider">Email</Label>
          <Input
            className="mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@vitaflow.edu"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider">
            Temporary password
          </Label>
          <Input
            className="mt-1"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="min 6 chars"
          />
        </div>
        {role === "doctor" && (
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider">Specialty</Label>
            <Input
              className="mt-1"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="General Practice"
            />
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={busy}>
          <UserPlus className="mr-2 size-4" /> Create account
        </Button>
      </div>
    </form>
  );
}

function StaffList({
  users,
  onDelete,
}: {
  users: ReturnType<typeof listUsers>;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Role | "all">("all");
  const rows = users.filter((u) => filter === "all" || u.role === filter);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-clinic">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {rows.length} account{rows.length === 1 ? "" : "s"}
        </p>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
            <SelectItem value="doctor">Doctors</SelectItem>
            <SelectItem value="receptionist">Receptionists</SelectItem>
            <SelectItem value="patient">Patients</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ul className="divide-y divide-border">
        {rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No accounts match this filter.
          </li>
        )}
        {rows.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{u.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email}
                {u.specialty ? ` · ${u.specialty}` : ""}
                {u.matricNumber ? ` · ${u.matricNumber}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RolePill role={u.role} />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(u.id)}
                aria-label={`Delete ${u.fullName}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RolePill({ role }: { role: Role }) {
  const tone: Record<Role, string> = {
    admin: "bg-primary/10 text-primary",
    doctor: "bg-success-soft text-success",
    receptionist: "bg-clinic-100 text-clinic-700",
    patient: "bg-muted text-muted-foreground",
  };
  const Icon = role === "doctor" ? Stethoscope : role === "patient" ? Users : Users;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone[role]}`}
    >
      <Icon className="size-3" />
      {ROLE_LABEL[role]}
    </span>
  );
}
