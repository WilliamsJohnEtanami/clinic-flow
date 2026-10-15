import { AlertTriangle, ArrowUpRight, MoreHorizontal, XCircle } from "lucide-react";
import { formatDistanceToNowStrict } from "@/lib/utils/date";
import type { QueueEntry } from "@/lib/queue/types";
import { STATUS_LABEL } from "@/lib/queue/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface QueueTableProps {
  entries: QueueEntry[];
  /** When true, hide completed/cancelled rows. */
  hideResolved?: boolean;
  onTogglePriority?: (entry: QueueEntry) => void;
  onCancel?: (entry: QueueEntry) => void;
  onCall?: (entry: QueueEntry) => void;
  onComplete?: (entry: QueueEntry) => void;
  emptyLabel?: string;
}

export function QueueTable({
  entries,
  hideResolved,
  onTogglePriority,
  onCancel,
  onCall,
  onComplete,
  emptyLabel = "No patients in queue.",
}: QueueTableProps) {
  const visible = hideResolved
    ? entries.filter(
        (e) => e.status === "WAITING" || e.status === "CALLED" || e.status === "IN_CONSULTATION",
      )
    : entries;

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-clinic">
      <div className="hidden grid-cols-[110px_1fr_120px_140px_60px] gap-4 border-b border-border bg-clinic-100/40 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:grid">
        <span>Token</span>
        <span>Patient</span>
        <span>Status</span>
        <span>Waited</span>
        <span className="text-right">·</span>
      </div>
      <ul className="divide-y divide-border">
        {visible.map((entry) => (
          <QueueRow
            key={entry.id}
            entry={entry}
            onTogglePriority={onTogglePriority}
            onCancel={onCancel}
            onCall={onCall}
            onComplete={onComplete}
          />
        ))}
      </ul>
    </div>
  );
}

function QueueRow({
  entry,
  onTogglePriority,
  onCancel,
  onCall,
  onComplete,
}: {
  entry: QueueEntry;
  onTogglePriority?: (e: QueueEntry) => void;
  onCancel?: (e: QueueEntry) => void;
  onCall?: (e: QueueEntry) => void;
  onComplete?: (e: QueueEntry) => void;
}) {
  const isEmergency = entry.priority === "EMERGENCY";
  const isInConsult = entry.status === "IN_CONSULTATION";
  const isDone = ["COMPLETED", "CANCELLED", "SKIPPED", "NO_SHOW"].includes(entry.status);
  const rowTone = isEmergency && entry.status === "WAITING" ? "bg-emergency-soft/40" : "";

  return (
    <li
      className={`grid grid-cols-1 items-center gap-3 px-5 py-4 md:grid-cols-[110px_1fr_120px_140px_60px] md:gap-4 ${rowTone}`}
    >
      {/* Token */}
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-lg font-bold ${
            isEmergency ? "text-emergency" : "text-primary"
          }`}
        >
          {entry.token}
        </span>
        {isEmergency && (
          <AlertTriangle className="size-3.5 text-emergency" aria-label="Emergency" />
        )}
      </div>

      {/* Patient */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.patient.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.patient.matricNumber ? `${entry.patient.matricNumber} · ` : ""}
          {entry.reason}
        </p>
      </div>

      {/* Status */}
      <div className="text-xs">
        <StatusPill entry={entry} />
      </div>

      {/* Waited */}
      <div className="font-mono text-xs text-muted-foreground">
        {isDone ? "—" : formatDistanceToNowStrict(entry.createdAt) + " ago"}
        {isInConsult && entry.doctor && (
          <span className="ml-2 text-foreground">· {entry.doctor.fullName}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onCall && entry.status === "WAITING" && (
              <DropdownMenuItem onClick={() => onCall(entry)}>
                <ArrowUpRight className="mr-2 size-4" /> Call to consultation
              </DropdownMenuItem>
            )}
            {onComplete && entry.status === "IN_CONSULTATION" && (
              <DropdownMenuItem onClick={() => onComplete(entry)}>
                <ArrowUpRight className="mr-2 size-4" /> Mark completed
              </DropdownMenuItem>
            )}
            {onTogglePriority && entry.status === "WAITING" && (
              <DropdownMenuItem onClick={() => onTogglePriority(entry)}>
                <AlertTriangle className="mr-2 size-4 text-emergency" />
                {isEmergency ? "Downgrade to routine" : "Mark emergency"}
              </DropdownMenuItem>
            )}
            {(onCall || onComplete || onTogglePriority) && onCancel && !isDone && (
              <DropdownMenuSeparator />
            )}
            {onCancel && !isDone && (
              <DropdownMenuItem
                onClick={() => onCancel(entry)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 size-4" /> Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function StatusPill({ entry }: { entry: QueueEntry }) {
  const map: Record<QueueEntry["status"], string> = {
    WAITING:
      entry.priority === "EMERGENCY"
        ? "bg-emergency text-emergency-foreground"
        : "bg-muted text-muted-foreground",
    IN_CONSULTATION: "bg-success-soft text-success",
    COMPLETED: "bg-clinic-100 text-clinic-700",
    CANCELLED: "bg-destructive/10 text-destructive",
    SKIPPED: "bg-muted text-muted-foreground",
    NO_SHOW: "bg-destructive/10 text-destructive",
  };
  const label =
    entry.status === "WAITING" && entry.priority === "EMERGENCY"
      ? "Urgent"
      : STATUS_LABEL[entry.status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[entry.status]}`}
    >
      {label}
    </span>
  );
}
