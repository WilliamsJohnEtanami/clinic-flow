import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VitaFlow — Smart Patient Flow for Campus Clinics" },
      {
        name: "description",
        content:
          "VitaFlow reduces waiting times, organizes patient flow, prioritizes emergencies, and predicts wait times for university and school healthcare facilities.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <Hero />
      <StatBar />
      <FeatureGrid />
      <QueueMockup />
      <RoleStrip />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />
        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition hover:text-foreground">
            Features
          </a>
          <a href="#queue" className="transition hover:text-foreground">
            Queue system
          </a>
          <a href="#roles" className="transition hover:text-foreground">
            For every role
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-clinic-100/60 to-transparent" />
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 md:pt-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-clinic">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Live queue system for school healthcare
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
              Smart patient flow for{" "}
              <span className="text-primary">campus clinics.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              VitaFlow digitizes registration, organizes walk-ins and appointments,
              prioritizes emergencies non-preemptively, and predicts waiting times in
              real time — without the weight of a hospital EMR.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Launch your clinic
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#queue">See live queue</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Demo credentials available on the sign-in page — no setup required.
            </p>
          </div>

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-transparent blur-2xl" />
      <div className="rounded-3xl bg-clinic-900 p-6 shadow-clinic-lg ring-1 ring-black/5 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="size-2.5 animate-pulse rounded-full bg-success" />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
            Now Serving
          </span>
        </div>

        <div className="mb-6 flex items-end justify-between rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <span className="font-mono text-6xl font-black tracking-tighter text-background md:text-7xl">
            A-114
          </span>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-clinic-500">
              Room 02
            </p>
            <p className="mt-1 text-xs text-white/60">Marcus H.</p>
          </div>
        </div>

        <div className="mb-6 flex items-end justify-between rounded-2xl border border-emergency/30 bg-emergency/10 p-6">
          <span className="font-mono text-6xl font-black tracking-tighter text-emergency md:text-7xl">
            E-002
          </span>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emergency">
              Triage 1
            </p>
            <p className="mt-1 text-xs text-white/60">Sarah J.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {["A-115", "B-042", "A-116", "C-009"].map((t) => (
            <div
              key={t}
              className="rounded-xl bg-white/5 p-4 ring-1 ring-white/5"
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                Token
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-background">{t}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary p-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary-foreground/70">
              Est. waiting time
            </p>
            <p className="mt-0.5 text-xl font-bold text-primary-foreground">~12 min</p>
          </div>
          <Clock className="size-6 text-primary-foreground/60" />
        </div>
      </div>
    </div>
  );
}

function StatBar() {
  const stats = [
    { value: "62%", label: "avg wait time reduction" },
    { value: "3.2×", label: "faster walk-in intake" },
    { value: "0", label: "missed emergency triage" },
    { value: "24/7", label: "real-time queue sync" },
  ];
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-mono text-3xl font-bold tracking-tighter text-foreground">
              {s.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: Users,
      title: "Digital registration",
      body: "Students, staff, and walk-ins registered in seconds with matric number, faculty, and vitals.",
    },
    {
      icon: CalendarClock,
      title: "Appointments & walk-ins",
      body: "Book, reschedule, or drop in — tokens generated automatically (A001, A002, …).",
    },
    {
      icon: AlertTriangle,
      title: "Non-preemptive priority",
      body: "Emergency cases jump the queue without interrupting an in-progress consultation.",
    },
    {
      icon: Clock,
      title: "Wait-time prediction",
      body: "Average consultation × patients ahead — recomputed live as consultations complete.",
    },
    {
      icon: Activity,
      title: "Live waiting-room display",
      body: "Airport-style board: NOW SERVING, NEXT, upcoming tokens, live clock. Zero refresh needed.",
    },
    {
      icon: BarChart3,
      title: "Reports & analytics",
      body: "Daily, weekly, and monthly reports on patients served, peak hours, and doctor workload.",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Built for school clinics
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Everything a campus health center needs. Nothing it doesn't.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Lightweight, deployable, and focused on patient flow — no bloated EMR baggage.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <article
            key={f.title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-clinic transition hover:-translate-y-0.5 hover:shadow-clinic-lg"
          >
            <div className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon className="size-5" />
            </div>
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function QueueMockup() {
  return (
    <section id="queue" className="border-y border-border bg-clinic-100/40">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Non-preemptive priority queue
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Emergencies jump the line — the current consultation still finishes.
            </h2>
            <p className="mt-4 text-muted-foreground">
              A patient marked emergency is inserted before every routine patient in
              the queue, but the doctor in session is never interrupted. When they
              finish, the emergency case is next.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Priority preserved without disrupting active care",
                "Wait times recomputed the moment the queue mutates",
                "Full audit trail of triage decisions",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-clinic-lg">
            <div className="flex items-center justify-between border-b border-border bg-clinic-100/50 px-6 py-4">
              <h3 className="text-sm font-semibold">Live patient queue</h3>
              <span className="text-xs font-bold uppercase tracking-widest text-emergency">
                Emergency override
              </span>
            </div>
            <div className="divide-y divide-border">
              <QueueRow
                token="A-114"
                name="Marcus Holloway"
                reason="Routine vaccination"
                status="Now Serving"
                statusTone="success"
                assignee="Dr. Aris · Room 02"
              />
              <QueueRow
                token="E-002"
                name="Sarah Jenkins"
                reason="High priority · Chest pain"
                status="Urgent"
                statusTone="emergency"
                assignee="Triage 1"
                emphasize
              />
              <QueueRow
                token="A-115"
                name="Lydia Chen"
                reason="Consultation"
                status="Waiting · 8m"
                statusTone="muted"
                assignee="—"
              />
              <QueueRow
                token="A-116"
                name="David Owalabi"
                reason="Follow-up"
                status="Waiting · 15m"
                statusTone="muted"
                assignee="—"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QueueRow({
  token,
  name,
  reason,
  status,
  statusTone,
  assignee,
  emphasize,
}: {
  token: string;
  name: string;
  reason: string;
  status: string;
  statusTone: "success" | "emergency" | "muted";
  assignee: string;
  emphasize?: boolean;
}) {
  const toneClasses: Record<typeof statusTone, string> = {
    success: "bg-success-soft text-success",
    emergency: "bg-emergency text-emergency-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 py-4 ${
        emphasize ? "bg-emergency-soft/60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={`font-mono text-base font-bold ${
            emphasize ? "text-emergency" : "text-primary"
          }`}
        >
          {token}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p
            className={`truncate text-xs ${
              emphasize
                ? "font-medium uppercase tracking-wide text-emergency"
                : "text-muted-foreground"
            }`}
          >
            {reason}
          </p>
        </div>
      </div>
      <div className="hidden items-center gap-4 sm:flex">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${toneClasses[statusTone]}`}>
          {status}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{assignee}</span>
      </div>
    </div>
  );
}

function RoleStrip() {
  const roles = [
    {
      icon: ShieldCheck,
      title: "Administrator",
      body: "Manage staff, configure clinic settings, review analytics and reports.",
    },
    {
      icon: Stethoscope,
      title: "Doctor",
      body: "See your queue, call the next patient, complete consultations.",
    },
    {
      icon: Users,
      title: "Receptionist",
      body: "Register walk-ins, generate tokens, mark emergencies, check patients in.",
    },
    {
      icon: CalendarClock,
      title: "Patient",
      body: "Book appointments, view your token, track your live queue position.",
    },
  ];
  return (
    <section id="roles" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Role-based workflows
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          One system. Four purpose-built dashboards.
        </h2>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <div key={r.title} className="rounded-2xl border border-border bg-card p-6 shadow-clinic">
            <r.icon className="mb-4 size-5 text-primary" />
            <h3 className="text-sm font-bold">{r.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="overflow-hidden rounded-3xl bg-clinic-900 p-10 text-center shadow-clinic-lg md:p-16">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-background md:text-4xl">
          Ready to run your clinic like a control tower?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-background/70">
          Sign in with a demo account — Admin, Doctor, Receptionist, or Patient — and
          explore every workflow in seconds.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">
              Sign in to demo
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
        <Logo size="sm" />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} VitaFlow · Smart patient flow for school healthcare
          facilities
        </p>
      </div>
    </footer>
  );
}
