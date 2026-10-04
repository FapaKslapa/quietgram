import type { feedModes } from "@nodistraction/db";
import type { WeaveVariant } from "@/lib/weave";

export type FeedMode = (typeof feedModes)[number];

export type ModeDefinition = {
  mode: FeedMode;
  label: string;
  stamp: string;
  description: string;
  weave: WeaveVariant;
};

export const MODES: readonly ModeDefinition[] = [
  {
    mode: "friends",
    label: "Amici",
    stamp: "AMICI",
    description: "Chi ti segue e che segui, più le tue eccezioni.",
    weave: "double",
  },
  {
    mode: "following",
    label: "Seguiti",
    stamp: "SEGUITI",
    description: "Tutti gli account che segui.",
    weave: "wave",
  },
  {
    mode: "creators",
    label: "Creator",
    stamp: "CREATOR",
    description: "Solo profili e aziende con tanti follower.",
    weave: "hatch",
  },
];

const fallbackMode: ModeDefinition = {
  mode: "friends",
  label: "Amici",
  stamp: "AMICI",
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
