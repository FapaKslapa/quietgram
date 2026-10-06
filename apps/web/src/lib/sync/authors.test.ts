import { describe, expect, it } from "vitest";
import { type AuthorCandidate, rankAuthors } from "@/lib/sync/authors";
import {
  afterAuthors,
  authorsProgress,
  MAX_AUTHORS_AFTER_CLEAN_RUN,
  MAX_AUTHORS_PER_RUN,
  maxAuthorsForRun,
  remainingSteps,
} from "@/lib/sync/run-state";

const SINCE = 1_000 * 86_400_000;
const DAY = 86_400_000;
const WINDOW_START = SINCE - 14 * DAY;

const candidate = (id: string, overrides: Partial<AuthorCandidate> = {}): AuthorCandidate => ({
  id,
  checkedAt: null,
  lastPostAt: null,
  latestReelMedia: null,
  ...overrides,
});

describe("rankAuthors", () => {
  it("puts never-checked authors with a known recent reel first, newest first", () => {
    const ranked = rankAuthors(
      [
        candidate("unknown"),
        candidate("older", { latestReelMedia: 100 }),
        candidate("newer", { latestReelMedia: 200 }),
      ],
      SINCE,
      WINDOW_START,
    );
    expect(ranked).toEqual(["newer", "older", "unknown"]);
  });

  it("orders never-checked, then active by oldest check, then dormant", () => {
    const ranked = rankAuthors(
      [
        candidate("dormant", {
          checkedAt: SINCE - 8 * DAY - 1,
          lastPostAt: WINDOW_START - DAY,
        }),
        candidate("active-new", { checkedAt: SINCE - 2 * DAY, lastPostAt: SINCE - DAY }),
        candidate("active-old", { checkedAt: SINCE - 5 * DAY, lastPostAt: SINCE - DAY }),
        candidate("fresh"),
      ],
      SINCE,
      WINDOW_START,
    );
    expect(ranked).toEqual(["fresh", "active-old", "active-new", "dormant"]);
  });

  it("skips authors already checked in this run and dormant ones checked this week", () => {
    const ranked = rankAuthors(
      [
        candidate("done", { checkedAt: SINCE, lastPostAt: SINCE - DAY }),
        candidate("sleepy", { checkedAt: SINCE - DAY, lastPostAt: WINDOW_START - DAY }),
      ],
      SINCE,
      WINDOW_START,
    );
    expect(ranked).toEqual([]);
  });

  it("is deterministic on ties", () => {
    expect(rankAuthors([candidate("b"), candidate("a")], SINCE, WINDOW_START)).toEqual(["a", "b"]);
  });
});

describe("run sizing and progress", () => {
  it("grows the run only after a clean previous run", () => {
    expect(maxAuthorsForRun(false)).toBe(MAX_AUTHORS_PER_RUN);
    expect(maxAuthorsForRun(true)).toBe(MAX_AUTHORS_AFTER_CLEAN_RUN);
    expect(MAX_AUTHORS_AFTER_CLEAN_RUN / 6).toBe(12);
  });

  it("walks the timeline after authors outside friends mode", () => {
    expect(afterAuthors("friends")).toBeNull();
    expect(afterAuthors("following")).toEqual({ phase: "timeline", cursor: null, page: 0 });
    expect(afterAuthors("creators")).toEqual({ phase: "timeline", cursor: null, page: 0 });
  });

  it("counts the timeline pages in the step estimate", () => {
    const state = { phase: "authors", since: 1, remaining: 12 } as const;
    expect(remainingSteps(state, "friends", "engine")).toBe(2);
    expect(remainingSteps(state, "following", "engine")).toBe(4);
  });

  it("reports checked and total accounts", () => {
    expect(
      authorsProgress({ phase: "authors", since: 1, remaining: 48, planned: 72, population: 1000 }),
    ).toEqual({ checked: 24, total: 1000 });
    expect(authorsProgress({ phase: "counts" })).toBeNull();
    expect(authorsProgress(null)).toBeNull();
  });
});
