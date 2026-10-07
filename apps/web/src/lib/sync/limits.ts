import { REFRESH_COOLDOWN_MS } from "@/lib/sync/cooldown";

export type SyncProfile = "fast" | "normal";

export type SyncLimits = {
  profile: SyncProfile;
  cooldownMs: number;
  authorsPerStep: number;
  maxAuthors: number;
  maxAuthorsAfterClean: number;
};

export const FAST_REFRESH_COOLDOWN_MS = 2 * 60_000;
export const FAST_BACKOFF_MS = 30 * 60_000;

export const NORMAL_LIMITS: SyncLimits = {
  profile: "normal",
  cooldownMs: REFRESH_COOLDOWN_MS,
  authorsPerStep: 6,
  maxAuthors: 60,
  maxAuthorsAfterClean: 72,
};

export const FAST_LIMITS: SyncLimits = {
  profile: "fast",
  cooldownMs: FAST_REFRESH_COOLDOWN_MS,
  authorsPerStep: 8,
  maxAuthors: 150,
  maxAuthorsAfterClean: 180,
};

export const limitsFor = (profile: SyncProfile): SyncLimits =>
  profile === "fast" ? FAST_LIMITS : NORMAL_LIMITS;

export const resolveProfile = (
  source: "extension" | "credentials" | null,
  backoffUntil: Date | null,
  now: Date,
): SyncProfile => {
  if (source !== "credentials") return "normal";
  return backoffUntil !== null && backoffUntil.getTime() > now.getTime() ? "normal" : "fast";
};
