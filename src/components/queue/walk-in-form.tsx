import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWalkIn } from "@/lib/queue/api-hooks";

const schema = z.object({
  patientName: z.string().min(2, "Enter the patient's full name."),
  matricNumber: z.string().optional(),
  phone: z.string().optional(),
  reason: z.string().min(3, "What is the visit for?"),
  notes: z.string().optional(),
  emergency: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function WalkInForm() {
  const createWalkIn = useCreateWalkIn();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientName: "",
      matricNumber: "",
      phone: "",
      reason: "",
      notes: "",
      emergency: false,
    },
  });
  const emergency = watch("emergency");

  const onSubmit = handleSubmit(async (values) => {
    try {
      const entry = await createWalkIn.mutateAsync({
        patientName: values.patientName.trim(),
        matricNumber: values.matricNumber || undefined,
        phone: values.phone || undefined,
        reason: values.reason.trim(),
        notes: values.notes || undefined,
        priority: values.emergency ? "EMERGENCY" : "ROUTINE",
      });
      toast.success(`Token ${entry.token} issued`, {
        description: `${values.patientName} added to the ${values.emergency ? "emergency" : "routine"} queue.`,
      });
      reset();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to register patient.";
      toast.error(message);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-2xl border bg-card p-6 shadow-clinic transition ${
        emergency ? "border-emergency/60 ring-1 ring-emergency/30" : "border-border"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Register walk-in</h2>
          <p className="text-xs text-muted-foreground">A token is generated automatically.</p>
        </div>
        <label
          htmlFor="emergency-toggle"
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
            emergency
              ? "border-emergency bg-emergency text-emergency-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="size-3.5" />
          Emergency
          <Switch
            id="emergency-toggle"
            checked={emergency}
            onCheckedChange={(v) => setValue("emergency", v)}
            aria-label="Mark as emergency"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" error={errors.patientName?.message}>
          <Input
            placeholder="e.g. Marcus Holloway"
            autoComplete="off"
            {...register("patientName")}
          />
        </Field>
        <Field label="Matric / staff ID" hint="Optional">
          <Input placeholder="CSC/2021/044" autoComplete="off" {...register("matricNumber")} />
        </Field>
        <Field label="Phone" hint="Optional">
          <Input placeholder="+234 ..." autoComplete="off" {...register("phone")} />
        </Field>
        <Field label="Reason for visit" error={errors.reason?.message}>
          <Input placeholder="e.g. Headache" autoComplete="off" {...register("reason")} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes" hint="Optional — vitals, complaint detail, triage notes">
            <Textarea
              placeholder="BP 120/80 · Temp 37.4°C · onset 2h ago"
              rows={3}
              {...register("notes")}
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {emergency
            ? "Emergency inserts before all routine patients (non-preemptive)."
            : "Patient will be added to the end of the routine queue."}
        </p>
        <Button type="submit" disabled={createWalkIn.isPending}>
          {createWalkIn.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 size-4" />
          )}
          Issue token
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
          {label}
        </Label>
        {hint && !error && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
