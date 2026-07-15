import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";
import { RoleShell } from "./admin";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "Patient · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientHome,
});

function PatientHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "patient") {
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

  return (
    <RoleShell
      role={ROLE_LABEL[user.role]}
      title="Patient Portal"
      subtitle="Book appointments, view your token, and track your live queue position."
      user={user.fullName}
      onSignOut={async () => {
        await signOut();
        navigate({ to: "/" });
      }}
    />
  );
}
