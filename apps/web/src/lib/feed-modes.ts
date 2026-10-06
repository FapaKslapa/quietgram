import type { feedModes } from "@nodistraction/db";
import type { WeaveVariant } from "@/lib/weave";

export type FeedMode = (typeof feedModes)[number];

export type ModeDefinition = {
  mode: FeedMode;
  label: string;
  description: string;
  weave: WeaveVariant;
};

export const MODES: readonly ModeDefinition[] = [
  {
    mode: "friends",
    label: "Amici",
    description: "Chi ti segue e che segui, più le tue eccezioni.",
    weave: "double",
  },
  {
    mode: "following",
    label: "Seguiti",
    description: "Tutti gli account che segui.",
    weave: "wave",
  },
  {
    mode: "creators",
    label: "Creator",
    description: "Solo profili e aziende con tanti follower.",
    weave: "hatch",
  },
];

const fallbackMode: ModeDefinition = {
  mode: "friends",
  label: "Amici",
  description: "",
  weave: "double",
};

export const modeDefinition = (mode: FeedMode): ModeDefinition =>
  MODES.find((definition) => definition.mode === mode) ?? MODES[0] ?? fallbackMode;

export const THRESHOLD_STEPS = [1_000, 5_000, 10_000, 50_000, 100_000, 500_000] as const;

export const formatFollowers = (count: number): string =>
  String(Math.trunc(count)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const thresholdIndex = (threshold: number): number => {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  THRESHOLD_STEPS.forEach((step, index) => {
    const distance = Math.abs(step - threshold);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

export const thresholdAt = (index: number): number =>
  THRESHOLD_STEPS[Math.min(Math.max(Math.trunc(index), 0), THRESHOLD_STEPS.length - 1)] ??
  THRESHOLD_STEPS[0];

export const RECENCY_STEPS = [3, 7, 14, 30, 60] as const;

export const recencyIndex = (days: number): number => {
  const exact = RECENCY_STEPS.findIndex((step) => step >= days);
  return exact === -1 ? RECENCY_STEPS.length - 1 : exact;
};

export const recencyAt = (index: number): number =>
  RECENCY_STEPS[Math.min(Math.max(Math.trunc(index), 0), RECENCY_STEPS.length - 1)] ??
  RECENCY_STEPS[0];
