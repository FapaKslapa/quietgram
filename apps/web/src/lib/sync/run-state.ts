import { z } from "zod";
import type { FeedMode } from "@/lib/sync/feed-mode";
import type { SourceKind } from "@/lib/sync/source";

export const MAX_TIMELINE_PAGES = 2;
export const AUTHORS_PER_STEP = 6;
export const POSTS_PER_AUTHOR = 3;
export const MAX_AUTHORS_PER_RUN = 60;
export const MAX_AUTHORS_AFTER_CLEAN_RUN = 72;

export const maxAuthorsForRun = (previousRunCompleted: boolean): number =>
  previousRunCompleted ? MAX_AUTHORS_AFTER_CLEAN_RUN : MAX_AUTHORS_PER_RUN;
const AUTHORS_ESTIMATE_STEPS = 3;

const runStateSchema = z.compile(
  z.discriminatedUnion("phase", [
    z.object({
      phase: z.literal("following"),
      cursor: z.string().nullable(),
      ids: z.array(z.string()),
    }),
    z.object({
      phase: z.literal("followers"),
      cursor: z.string().nullable(),
      ids: z.array(z.string()),
    }),
    z.object({ phase: z.literal("timeline"), cursor: z.string().nullable(), page: z.number() }),
    z.object({
      phase: z.literal("authors"),
      since: z.number(),
      remaining: z.number(),
      planned: z.number().optional(),
      population: z.number().optional(),
    }),
    z.object({ phase: z.literal("counts") }),
  ]),
);

export type RunState = z.output<typeof runStateSchema>;

export const parseRunState = (raw: string | null): RunState =>
  runStateSchema.parse(JSON.parse(raw ?? "null"));

const restoreSchema = z.compile(z.object({ restoreAt: z.number().nullable().optional() }));

export const parseRestoreAt = (raw: string | null): number | null => {
  const parsed = restoreSchema.safeParse(JSON.parse(raw ?? "{}"));
  return parsed.success ? (parsed.data.restoreAt ?? null) : null;
};

export const serializeRunState = (state: RunState, restoreAt: number | null = null): string =>
  JSON.stringify({ ...state, restoreAt });

export const afterTimeline = (mode: FeedMode, kind: SourceKind = "direct"): RunState | null =>
  mode === "creators" && kind === "direct" ? { phase: "counts" } : null;

export const afterAuthors = (mode: FeedMode): RunState | null =>
  mode === "friends" ? null : { phase: "timeline", cursor: null, page: 0 };

export const authorsProgress = (
  state: RunState | null,
): { checked: number; total: number } | null =>
  state?.phase === "authors" && state.planned !== undefined && state.population !== undefined
    ? { checked: state.planned - state.remaining, total: state.population }
    : null;

export const remainingSteps = (
  state: RunState | null,
  mode: FeedMode,
  kind: SourceKind,
): number => {
  const direct = kind === "direct";
  const counts = direct && mode === "creators" ? 1 : 0;
  const timelineWalk = !direct && mode !== "friends" ? MAX_TIMELINE_PAGES : 0;
  const posts = direct ? MAX_TIMELINE_PAGES : AUTHORS_ESTIMATE_STEPS + timelineWalk;
  if (state === null) return 0;
  switch (state.phase) {
    case "following":
      return 2 + posts + counts;
    case "followers":
      return 1 + posts + counts;
    case "timeline":
      return MAX_TIMELINE_PAGES - state.page + counts;
    case "authors":
      return Math.max(1, Math.ceil(state.remaining / AUTHORS_PER_STEP)) + timelineWalk;
    case "counts":
      return 1;
  }
};
