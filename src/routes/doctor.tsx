import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";
import { RoleShell } from "./admin";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DoctorHome,
});

function DoctorHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "doctor") {
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
      title="Doctor Console"
      subtitle="See your queue, call the next patient, and complete consultations."
      user={user.fullName}
      onSignOut={async () => {
        await signOut();
        navigate({ to: "/" });
      }}
    />
  );
}
