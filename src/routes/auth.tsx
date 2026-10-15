import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/context";
import { ROLE_HOME } from "@/lib/auth/types";

const authSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in · VitaFlow" },
      {
        name: "description",
        content: "Access your VitaFlow dashboard — admin, doctor, receptionist, or patient.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated" && user) {
      navigate({ to: ROLE_HOME[user.role] });
    }
  }, [status, user, navigate]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      {/* Panel: brand */}
      <aside className="relative hidden overflow-hidden bg-clinic-900 p-10 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <Logo variant="invert" />
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-background/60 transition hover:text-background"
          >
            <ArrowLeft className="size-3" />
            Back to site
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="text-2xl font-medium leading-snug text-background">
            "VitaFlow cut our average waiting time in half. Emergencies are handled without ever
            losing sight of the students already in a consultation."
          </blockquote>
          <div>
            <p className="font-semibold text-background">Dr. Ada Okonkwo</p>
            <p className="text-sm text-background/60">Chief Medical Officer · Campus Health</p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {[
            { label: "Now serving", value: "A-114", tone: "text-background" },
            { label: "Waiting", value: "12", tone: "text-background" },
            { label: "Emergencies", value: "01", tone: "text-emergency" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-background/50">
                {s.label}
              </p>
              <p className={`mt-1 font-mono text-2xl font-bold ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Panel: form */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <Logo />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "signin" ? <SignInForm /> : <SignUpForm />}

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to VitaFlow's clinical usage policy.
          </p>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign In
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type SignInValues = z.infer<typeof signInSchema>;

function SignInForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const s = await signIn(values);
      toast.success(`Welcome back, ${s.user.fullName.split(" ")[0]}`);
      navigate({ to: ROLE_HOME[s.user.role] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your VitaFlow clinical console.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@university.edu"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => toast.info("Password reset available in the full system.")}
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            {...form.register("password")}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sign Up
// ---------------------------------------------------------------------------

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email").max(120),
    role: z.literal("patient"),
    matricNumber: z.string().trim().min(1, "Matric number is required").max(30),
    password: z.string().min(6, "At least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });
type SignUpValues = z.infer<typeof signUpSchema>;

function SignUpForm() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "patient",
      matricNumber: "",
      password: "",
      confirm: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const s = await signUp({
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        password: values.password,
        matricNumber: values.role === "patient" ? values.matricNumber : undefined,
      });
      toast.success("Account created — welcome to VitaFlow.");
      navigate({ to: ROLE_HOME[s.user.role] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a patient account to access your clinic visits.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Full name</Label>
        <Input id="signup-name" autoComplete="name" {...form.register("fullName")} />
        {form.formState.errors.fullName && (
          <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      {
        <div className="space-y-1.5">
          <Label htmlFor="signup-matric">Matric / Student ID</Label>
          <Input
            id="signup-matric"
            placeholder="e.g. CSC/2021/044"
            {...form.register("matricNumber")}
          />
          {form.formState.errors.matricNumber && (
            <p className="text-xs text-destructive">{form.formState.errors.matricNumber.message}</p>
          )}
        </div>
      }

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="signup-pw">Password</Label>
          <Input
            id="signup-pw"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-confirm">Confirm</Label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            {...form.register("confirm")}
          />
          {form.formState.errors.confirm && (
            <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
