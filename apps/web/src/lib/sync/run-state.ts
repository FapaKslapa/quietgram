import { z } from "zod";
import type { FeedMode } from "@/lib/sync/feed-mode";

export const MAX_TIMELINE_PAGES = 2;

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
    z.object({ phase: z.literal("counts") }),
  ]),
);

export type RunState = z.output<typeof runStateSchema>;

export const parseRunState = (raw: string | null): RunState =>
  runStateSchema.parse(JSON.parse(raw ?? "null"));

export const serializeRunState = (state: RunState): string => JSON.stringify(state);

export const afterTimeline = (mode: FeedMode): RunState | null =>
  mode === "creators" ? { phase: "counts" } : null;

export const remainingSteps = (state: RunState | null, mode: FeedMode): number => {
  const counts = mode === "creators" ? 1 : 0;
  if (state === null) return 0;
  switch (state.phase) {
    case "following":
      return 2 + MAX_TIMELINE_PAGES + counts;
    case "followers":
      return 1 + MAX_TIMELINE_PAGES + counts;
    case "timeline":
      return MAX_TIMELINE_PAGES - state.page + counts;
    case "counts":
      return 1;
  }
};
