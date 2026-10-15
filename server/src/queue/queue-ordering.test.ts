import { describe, it, expect } from "vitest";
import {
  rankQueueEntries,
  selectNextForCall,
  computeEstimatedWaitMinutes,
  type OrderableEntry,
} from "./queue-ordering";

function entry(overrides: Partial<OrderableEntry> & { id: string }): OrderableEntry {
  return {
    status: "WAITING",
    priority: "ROUTINE",
    registeredAt: new Date("2026-01-01T08:00:00Z"),
    ...overrides,
  };
}

describe("queue ordering — FIFO within routine class", () => {
  it("orders routine patients by registration time, earliest first", () => {
    const r1 = entry({ id: "r1", registeredAt: "2026-01-01T08:00:00Z" });
    const r2 = entry({ id: "r2", registeredAt: "2026-01-01T08:05:00Z" });
    const r3 = entry({ id: "r3", registeredAt: "2026-01-01T08:02:00Z" });

    const ranked = rankQueueEntries([r2, r1, r3]);
    expect(ranked.map((e) => e.id)).toEqual(["r1", "r3", "r2"]);
  });
});

describe("queue ordering — FIFO within emergency class", () => {
  it("orders emergency patients by registration time, earliest first", () => {
    const e1 = entry({ id: "e1", priority: "EMERGENCY", registeredAt: "2026-01-01T08:10:00Z" });
    const e2 = entry({ id: "e2", priority: "EMERGENCY", registeredAt: "2026-01-01T08:01:00Z" });

    const ranked = rankQueueEntries([e1, e2]);
    expect(ranked.map((e) => e.id)).toEqual(["e2", "e1"]);
  });
});

describe("queue ordering — emergency priority over routine", () => {
  it("places all waiting emergencies ahead of all waiting routine patients", () => {
    const r1 = entry({ id: "r1", registeredAt: "2026-01-01T08:00:00Z" }); // arrived first
    const e1 = entry({ id: "e1", priority: "EMERGENCY", registeredAt: "2026-01-01T08:30:00Z" }); // arrived later

    const ranked = rankQueueEntries([r1, e1]);
    expect(ranked.map((e) => e.id)).toEqual(["e1", "r1"]);
  });
});

describe("queue ordering — non-preemptive behavior", () => {
  it("never places a waiting emergency ahead of an in-progress consultation", () => {
    const inProgress = entry({
      id: "r001",
      status: "IN_CONSULTATION",
      consultationStartAt: "2026-01-01T08:00:00Z",
    });
    const emergency = entry({
      id: "e001",
      priority: "EMERGENCY",
      registeredAt: "2026-01-01T08:05:00Z",
    });

    const ranked = rankQueueEntries([emergency, inProgress]);
    expect(ranked[0].id).toBe("r001");
    expect(ranked[1].id).toBe("e001");
  });

  it("does not select a new patient for call while one is already in consultation", () => {
    // selectNextForCall only looks at WAITING entries — an IN_CONSULTATION
    // entry is never a candidate, so it can never be displaced.
    const inProgress = entry({ id: "r001", status: "IN_CONSULTATION" });
    const waitingRoutine = entry({ id: "r002" });

    const next = selectNextForCall([inProgress, waitingRoutine]);
    expect(next?.id).toBe("r002");
  });
});

describe("queue ordering — multiple emergencies scenario (from spec example)", () => {
  it("matches the exact worked example from the design spec", () => {
    // Current: R001 in consultation
    const r001 = entry({
      id: "R001",
      status: "IN_CONSULTATION",
      consultationStartAt: "2026-01-01T08:00:00Z",
    });
    // Waiting: R002, R003
    const r002 = entry({ id: "R002", registeredAt: "2026-01-01T08:01:00Z" });
    const r003 = entry({ id: "R003", registeredAt: "2026-01-01T08:02:00Z" });
    // Emergency arrives: E001 — must NOT interrupt R001
    const e001 = entry({ id: "E001", priority: "EMERGENCY", registeredAt: "2026-01-01T08:03:00Z" });

    let ranked = rankQueueEntries([r001, r002, r003, e001]);
    expect(ranked.map((e) => e.id)).toEqual(["R001", "E001", "R002", "R003"]);

    // A second emergency arrives: E002
    const e002 = entry({ id: "E002", priority: "EMERGENCY", registeredAt: "2026-01-01T08:04:00Z" });
    ranked = rankQueueEntries([r001, r002, r003, e001, e002]);
    expect(ranked.map((e) => e.id)).toEqual(["R001", "E001", "E002", "R002", "R003"]);

    // R001 completes — the highest-priority waiting patient (E001) is selected next.
    const r001Completed = {
      ...r001,
      status: "COMPLETED" as const,
      consultationEndAt: "2026-01-01T08:10:00Z",
    };
    const next = selectNextForCall([r001Completed, r002, r003, e001, e002]);
    expect(next?.id).toBe("E001");
  });
});

describe("queue ordering — insertion and reordering", () => {
  it("re-ranks correctly as new entries are inserted over time", () => {
    const queue: OrderableEntry[] = [];
    queue.push(entry({ id: "r1", registeredAt: "2026-01-01T08:00:00Z" }));
    expect(rankQueueEntries(queue).map((e) => e.id)).toEqual(["r1"]);

    queue.push(entry({ id: "e1", priority: "EMERGENCY", registeredAt: "2026-01-01T08:01:00Z" }));
    expect(rankQueueEntries(queue).map((e) => e.id)).toEqual(["e1", "r1"]);

    queue.push(entry({ id: "r2", registeredAt: "2026-01-01T08:02:00Z" }));
    expect(rankQueueEntries(queue).map((e) => e.id)).toEqual(["e1", "r1", "r2"]);
  });
});

describe("queue ordering — consultation completion", () => {
  it("moves a completed entry out of the active groups and sorts by most recent first", () => {
    const c1 = entry({
      id: "c1",
      status: "COMPLETED",
      consultationEndAt: "2026-01-01T08:00:00Z",
    });
    const c2 = entry({
      id: "c2",
      status: "COMPLETED",
      consultationEndAt: "2026-01-01T09:00:00Z",
    });
    const waiting = entry({ id: "r1", registeredAt: "2026-01-01T08:30:00Z" });

    const ranked = rankQueueEntries([c1, c2, waiting]);
    // waiting patient always ranks ahead of completed entries
    expect(ranked[0].id).toBe("r1");
    // most recently completed first
    expect(ranked.slice(1).map((e) => e.id)).toEqual(["c2", "c1"]);
  });
});

describe("estimated wait time calculation", () => {
  it("gives 0 minutes to the immediate next patient", () => {
    const waiting = entry({ id: "r1", registeredAt: "2026-01-01T08:00:00Z" });
    const ewt = computeEstimatedWaitMinutes([waiting], 12);
    expect(ewt.get("r1")).toBe(0);
  });

  it("accounts for an in-progress consultation as one slot ahead", () => {
    const inProgress = entry({ id: "r001", status: "IN_CONSULTATION" });
    const waiting = entry({ id: "r002", registeredAt: "2026-01-01T08:00:00Z" });
    const ewt = computeEstimatedWaitMinutes([inProgress, waiting], 10);
    expect(ewt.get("r002")).toBe(10);
  });

  it("gives emergencies a shorter EWT than routine patients behind them", () => {
    const routine = entry({ id: "r1", registeredAt: "2026-01-01T08:00:00Z" });
    const emergency = entry({
      id: "e1",
      priority: "EMERGENCY",
      registeredAt: "2026-01-01T08:05:00Z",
    });
    const ewt = computeEstimatedWaitMinutes([routine, emergency], 15);
    expect(ewt.get("e1")).toBe(0); // emergency ranked first among waiting
    expect(ewt.get("r1")).toBe(15); // routine now behind the emergency
  });
});
