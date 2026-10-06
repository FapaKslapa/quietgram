export const PULL_THRESHOLD = 72;
export const PULL_HOLD = 56;
export const PULL_MAX = 140;
const PULL_STIFFNESS = 1.2;

export type PullPhase = "idle" | "pulling" | "armed" | "blocked" | "refreshing";

export type PullDecision = "trigger" | "blocked" | "rebound";

export const pullResistance = (rawDistance: number): number =>
  rawDistance <= 0 ? 0 : PULL_MAX * (1 - Math.exp(-rawDistance / (PULL_MAX * PULL_STIFFNESS)));

export const pullProgress = (distance: number): number =>
  Math.min(Math.max(distance / PULL_THRESHOLD, 0), 1);

export const pullPhase = (distance: number, cooling: boolean, busy: boolean): PullPhase => {
  if (busy) return "refreshing";
  if (distance <= 0) return "idle";
  if (distance < PULL_THRESHOLD) return "pulling";
  return cooling ? "blocked" : "armed";
};

export const decidePull = (distance: number, cooling: boolean, busy: boolean): PullDecision => {
  if (distance < PULL_THRESHOLD) return "rebound";
  return cooling || busy ? "blocked" : "trigger";
};

export const pullLabel = (phase: PullPhase, nextLabel: string): string | null => {
  switch (phase) {
    case "idle":
      return null;
    case "pulling":
      return "Tira per aggiornare";
    case "armed":
      return "Rilascia per aggiornare";
    case "blocked":
      return nextLabel;
    case "refreshing":
      return "Aggiornamento in corso";
  }
};

export type TouchPoint = { x: number; y: number };

export type PullStart = "pull" | "ignore" | "undecided";

const DECIDE_DISTANCE = 6;

export const classifyPullStart = (origin: TouchPoint, current: TouchPoint): PullStart => {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  if (Math.hypot(dx, dy) < DECIDE_DISTANCE) return "undecided";
  return dy > 0 && dy > Math.abs(dx) ? "pull" : "ignore";
};
