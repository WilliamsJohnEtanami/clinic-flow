import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "invert";
}

const SIZES = {
  sm: { box: "size-7", text: "text-base" },
  md: { box: "size-8", text: "text-lg" },
  lg: { box: "size-10", text: "text-xl" },
};

export function Logo({ className, size = "md", variant = "default" }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          s.box,
          "grid place-items-center rounded-lg font-bold text-primary-foreground bg-primary shadow-primary-glow",
          variant === "invert" && "bg-background text-primary shadow-none ring-1 ring-border",
        )}
        aria-hidden
      >
        <span className={cn("font-mono", size === "lg" ? "text-lg" : "text-sm")}>V</span>
      </div>
      <span
        className={cn(
          "font-bold tracking-tight",
          s.text,
          variant === "invert" ? "text-background" : "text-foreground",
        )}
      >
        VITAFLOW
      </span>
    </div>
  );
}
