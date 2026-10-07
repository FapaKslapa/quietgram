export const IMAGE_DURATION_MS = 5_000;
export const MIN_VIDEO_DURATION_MS = 1_000;
export const MAX_VIDEO_DURATION_MS = 60_000;
export const LONG_PRESS_MS = 250;
export const TAP_SLOP_PX = 10;
export const PREVIOUS_ZONE = 0.3;

export type TrayEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  latestReelMedia: number | null;
  seen: boolean;
};

export type StoryItem = {
  id: string;
  takenAt: number;
  expiresAt: number;
  media: { kind: "image" | "video"; url: string; width: number; height: number };
  productType: string;
};

export type StoryCursor = { group: number; item: number };

export type Release = "tap" | "hold" | "drag";

export type TapZone = "previous" | "next";

export const orderTray = <T extends { seen: boolean }>(entries: readonly T[]): T[] => [
  ...entries.filter((entry) => !entry.seen),
  ...entries.filter((entry) => entry.seen),
];

export const itemDuration = (
  kind: StoryItem["media"]["kind"],
  videoDurationSeconds: number | null,
): number => {
  if (kind === "image") return IMAGE_DURATION_MS;
  if (videoDurationSeconds === null || !Number.isFinite(videoDurationSeconds)) {
    return IMAGE_DURATION_MS;
  }
  return Math.min(
    Math.max(Math.round(videoDurationSeconds * 1000), MIN_VIDEO_DURATION_MS),
    MAX_VIDEO_DURATION_MS,
  );
};

export const tapZone = (x: number, width: number): TapZone =>
  width > 0 && x / width < PREVIOUS_ZONE ? "previous" : "next";

export const classifyRelease = (durationMs: number, distancePx: number): Release => {
  if (distancePx > TAP_SLOP_PX) return "drag";
  return durationMs >= LONG_PRESS_MS ? "hold" : "tap";
};

export const advanceElapsed = (
  elapsedMs: number,
  deltaMs: number,
  durationMs: number,
  running: boolean,
): number => (running ? Math.min(elapsedMs + Math.max(0, deltaMs), durationMs) : elapsedMs);

export const storyProgress = (elapsedMs: number, durationMs: number): number =>
  durationMs <= 0 ? 0 : Math.min(Math.max(elapsedMs / durationMs, 0), 1);

export const isComplete = (elapsedMs: number, durationMs: number): boolean =>
  durationMs > 0 && elapsedMs >= durationMs;

export const segmentFill = (segment: number, active: number, activeProgress: number): number => {
  if (segment < active) return 1;
  if (segment > active) return 0;
  return Math.min(Math.max(activeProgress, 0), 1);
};

export const nextCursor = (
  cursor: StoryCursor,
  itemCount: number,
  groupCount: number,
): StoryCursor | null => {
  if (cursor.item + 1 < itemCount) return { group: cursor.group, item: cursor.item + 1 };
  if (cursor.group + 1 < groupCount) return { group: cursor.group + 1, item: 0 };
  return null;
};

export const previousCursor = (cursor: StoryCursor): StoryCursor => {
  if (cursor.item > 0) return { group: cursor.group, item: cursor.item - 1 };
  if (cursor.group > 0) return { group: cursor.group - 1, item: 0 };
  return cursor;
};

export const isExpired = (item: Pick<StoryItem, "expiresAt">, now: number): boolean =>
  item.expiresAt > 0 && item.expiresAt <= now;

export const liveItems = <T extends Pick<StoryItem, "expiresAt">>(
  items: readonly T[],
  now: number,
): T[] => items.filter((item) => !isExpired(item, now));

export const ringState = (entry: Pick<TrayEntry, "seen">): "unseen" | "seen" =>
  entry.seen ? "seen" : "unseen";

export type MediaPhase = "loading" | "ready" | "failed";

export type SeenMap = Record<string, number>;

export const SEEN_STORAGE_KEY = "stories-seen";
export const MAX_SEEN_ENTRIES = 200;
export const USER_STORIES_STALE_MS = 60_000;

export const clockRunning = (phase: MediaPhase, held: boolean): boolean =>
  phase === "ready" && !held;

export const isSeenLocally = (
  entry: Pick<TrayEntry, "userId" | "latestReelMedia">,
  seen: SeenMap,
): boolean => {
  const stored = seen[entry.userId];
  return stored !== undefined && stored >= (entry.latestReelMedia ?? 0);
};

export const applySeen = <T extends Pick<TrayEntry, "userId" | "latestReelMedia" | "seen">>(
  entries: readonly T[],
  seen: SeenMap,
): T[] =>
  entries.map((entry) =>
    entry.seen || !isSeenLocally(entry, seen) ? entry : { ...entry, seen: true },
  );

export const markSeenLocal = (
  seen: SeenMap,
  entry: Pick<TrayEntry, "userId" | "latestReelMedia">,
): SeenMap => {
  if (isSeenLocally(entry, seen)) return seen;
  const kept = Object.entries(seen).filter(([key]) => key !== entry.userId);
  const next = [...kept, [entry.userId, entry.latestReelMedia ?? 0] as const];
  return Object.fromEntries(next.slice(-MAX_SEEN_ENTRIES));
};

export const parseSeenMap = (raw: string | null): SeenMap => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: SeenMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
};

export const backTarget = (cursor: StoryCursor): StoryCursor | "restart" => {
  const target = previousCursor(cursor);
  return target === cursor ? "restart" : target;
};

export const upcomingItem = <T>(items: readonly T[], index: number): T | null =>
  items[index + 1] ?? null;

export const slideDirection = (from: number, to: number): 1 | -1 => (to >= from ? 1 : -1);
