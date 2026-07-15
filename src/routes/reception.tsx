import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/types";
import { RoleShell } from "./admin";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "Reception · VitaFlow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceptionHome,
});

function ReceptionHome() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/auth" });
    else if (status === "authenticated" && user && user.role !== "receptionist") {
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
      title="Reception Console"
      subtitle="Register walk-ins, generate tokens, and manage today's queue."
      user={user.fullName}
      onSignOut={async () => {
        await signOut();
        navigate({ to: "/" });
      }}
    />
  );
}
