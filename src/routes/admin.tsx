import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";

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

  if (!user) return <RoleShellSkeleton />;

  return (
    <RoleShell
      role={ROLE_LABEL[user.role]}
      title="Administrator Console"
      subtitle="Manage staff, monitor performance, and configure clinic operations."
      user={user.fullName}
      onSignOut={async () => {
        await signOut();
        navigate({ to: "/" });
      }}
    />
  );
}

// ---- shared ----------------------------------------------------------------

export function RoleShell({
  role,
  title,
  subtitle,
  user,
  onSignOut,
}: {
  role: string;
  title: string;
  subtitle: string;
  user: string;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {role}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{role}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              This dashboard is scaffolded and ready for Module 2.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Auth, roles, and design system are live.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Coming next: queue management, walk-ins, appointments, analytics.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Say "continue" to build the next module.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function RoleShellSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
