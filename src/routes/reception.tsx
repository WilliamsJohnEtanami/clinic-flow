import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { KpiCards } from "@/components/queue/kpi-cards";
import { QueueTable } from "@/components/queue/queue-table";
import { WalkInForm } from "@/components/queue/walk-in-form";
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";
import { useMetrics, useQueue } from "@/lib/queue/hooks";
import { resetQueue, setStatus, togglePriority } from "@/lib/queue/store";
import type { QueueEntry } from "@/lib/queue/types";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "Reception · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceptionHome,
});

type Filter = "active" | "all" | "completed";

function ReceptionHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "receptionist") {
      navigate({ to: "/auth" });
    }
  }, [status, user, navigate]);

  const queue = useQueue();
  const metrics = useMetrics();

  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<QueueEntry | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = useMemo(() => {
    let list = queue;
    if (filter === "active")
      list = list.filter((e) => e.status === "waiting" || e.status === "in_consultation");
    else if (filter === "completed")
      list = list.filter((e) => e.status === "completed" || e.status === "cancelled");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.token.toLowerCase().includes(q) ||
          e.patientName.toLowerCase().includes(q) ||
          (e.matricNumber ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [queue, filter, search]);

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.fullName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {ROLE_LABEL[user.role]}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/appointments">Appointments</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmReset(true)}
              title="Reset demo queue"
            >
              <RefreshCw className="mr-2 size-4" /> Reset demo
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Reception Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Today's queue</h1>
          <p className="mt-1 text-muted-foreground">
            Register walk-ins, issue tokens, and manage patient flow in real time.
          </p>
        </div>

        <KpiCards metrics={metrics} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <WalkInForm registeredBy={user.id} />

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList>
                  <TabsTrigger value="active">
                    Active
                    <span className="ml-2 rounded bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                      {metrics.waiting + metrics.inConsultation}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input
                placeholder="Search token, name, matric…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <QueueTable
              entries={filtered}
              onTogglePriority={(entry) => {
                const next = togglePriority(entry.id);
                if (next) {
                  toast.success(
                    next.priority === "emergency"
                      ? `${entry.token} escalated to emergency`
                      : `${entry.token} downgraded to routine`,
                  );
                }
              }}
              onCancel={(entry) => setConfirmCancel(entry)}
              emptyLabel={
                filter === "active"
                  ? "No one is waiting. Register a walk-in to get started."
                  : filter === "completed"
                    ? "No completed visits yet today."
                    : "No patients registered yet today."
              }
            />
          </div>
        </div>
      </main>

      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this token?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCancel &&
                `Token ${confirmCancel.token} · ${confirmCancel.patientName} will be removed from the active queue. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep in queue</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmCancel) return;
                setStatus(confirmCancel.id, "cancelled");
                toast.success(`Token ${confirmCancel.token} cancelled`);
                setConfirmCancel(null);
              }}
            >
              Cancel token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo queue?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears every patient in this browser and reseeds the sample data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep data</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetQueue();
                toast.success("Queue reset");
                setConfirmReset(false);
              }}
            >
              Reset queue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
