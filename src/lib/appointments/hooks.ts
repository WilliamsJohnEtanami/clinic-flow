import { useSyncExternalStore } from "react";
import { listAppointments, subscribe } from "./store";
import type { Appointment } from "./types";

const empty: Appointment[] = [];

function getServerSnapshot(): null {
  return null;
}

export function useAppointments(): Appointment[] {
  const snap = useSyncExternalStore(subscribe, listAppointments, getServerSnapshot);
  return snap ?? empty;
}
