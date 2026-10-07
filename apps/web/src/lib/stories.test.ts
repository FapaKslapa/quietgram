import { describe, expect, it } from "vitest";
import {
  advanceElapsed,
  applySeen,
  backTarget,
  classifyRelease,
  clockRunning,
  IMAGE_DURATION_MS,
  isComplete,
  isExpired,
  isSeenLocally,
  itemDuration,
  liveItems,
  MAX_SEEN_ENTRIES,
  MAX_VIDEO_DURATION_MS,
  markSeenLocal,
  nextCursor,
  orderTray,
  parseSeenMap,
  previousCursor,
  ringState,
  type SeenMap,
  segmentFill,
  slideDirection,
  storyProgress,
  tapZone,
  upcomingItem,
} from "@/lib/stories";

describe("itemDuration", () => {
  it("uses five seconds for images", () => {
    expect(itemDuration("image", null)).toBe(IMAGE_DURATION_MS);
    expect(itemDuration("image", 30)).toBe(IMAGE_DURATION_MS);
  });

  it("uses the video duration clamped", () => {
    expect(itemDuration("video", 12.4)).toBe(12_400);
    expect(itemDuration("video", 0.2)).toBe(1_000);
    expect(itemDuration("video", 600)).toBe(MAX_VIDEO_DURATION_MS);
  });

  it("falls back when the duration is unknown", () => {
    expect(itemDuration("video", null)).toBe(IMAGE_DURATION_MS);
    expect(itemDuration("video", Number.NaN)).toBe(IMAGE_DURATION_MS);
    expect(itemDuration("video", Number.POSITIVE_INFINITY)).toBe(IMAGE_DURATION_MS);
  });
});

describe("tapZone", () => {
  it("goes back in the left third and forward elsewhere", () => {
    expect(tapZone(10, 390)).toBe("previous");
    expect(tapZone(116, 390)).toBe("previous");
    expect(tapZone(118, 390)).toBe("next");
    expect(tapZone(380, 390)).toBe("next");
  });

  it("goes forward when the width is unknown", () => {
    expect(tapZone(0, 0)).toBe("next");
  });
});

describe("classifyRelease", () => {
  it("separates tap, hold and drag", () => {
    expect(classifyRelease(80, 2)).toBe("tap");
    expect(classifyRelease(400, 3)).toBe("hold");
    expect(classifyRelease(100, 40)).toBe("drag");
    expect(classifyRelease(900, 40)).toBe("drag");
  });
});

describe("progress", () => {
  it("advances only while running and stops at the duration", () => {
    expect(advanceElapsed(1000, 16, 5000, true)).toBe(1016);
    expect(advanceElapsed(1000, 16, 5000, false)).toBe(1000);
    expect(advanceElapsed(4990, 100, 5000, true)).toBe(5000);
    expect(advanceElapsed(1000, -5, 5000, true)).toBe(1000);
  });

  it("derives fraction and completion", () => {
    expect(storyProgress(2500, 5000)).toBe(0.5);
    expect(storyProgress(9000, 5000)).toBe(1);
    expect(storyProgress(10, 0)).toBe(0);
    expect(isComplete(5000, 5000)).toBe(true);
    expect(isComplete(4999, 5000)).toBe(false);
    expect(isComplete(0, 0)).toBe(false);
  });

  it("fills segments before, at and after the active one", () => {
    expect(segmentFill(0, 2, 0.4)).toBe(1);
    expect(segmentFill(2, 2, 0.4)).toBe(0.4);
    expect(segmentFill(3, 2, 0.4)).toBe(0);
    expect(segmentFill(2, 2, 3)).toBe(1);
  });
});

describe("cursors", () => {
  it("moves through items then groups then closes", () => {
    expect(nextCursor({ group: 0, item: 0 }, 3, 2)).toEqual({ group: 0, item: 1 });
    expect(nextCursor({ group: 0, item: 2 }, 3, 2)).toEqual({ group: 1, item: 0 });
    expect(nextCursor({ group: 1, item: 0 }, 1, 2)).toBeNull();
  });

  it("moves back through items then groups and stays at the start", () => {
    expect(previousCursor({ group: 1, item: 2 })).toEqual({ group: 1, item: 1 });
    expect(previousCursor({ group: 1, item: 0 })).toEqual({ group: 0, item: 0 });
    expect(previousCursor({ group: 0, item: 0 })).toEqual({ group: 0, item: 0 });
  });
});

describe("tray", () => {
  it("lists unseen accounts first and keeps order inside each part", () => {
    const entries = [
      { id: "a", seen: true },
      { id: "b", seen: false },
      { id: "c", seen: true },
      { id: "d", seen: false },
    ];
    expect(orderTray(entries).map((entry) => entry.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("maps the ring state from the seen flag", () => {
    expect(ringState({ seen: false })).toBe("unseen");
    expect(ringState({ seen: true })).toBe("seen");
  });
});

describe("expiry", () => {
  it("drops expired items and keeps unknown expiry", () => {
    const now = 1_000;
    expect(isExpired({ expiresAt: 900 }, now)).toBe(true);
    expect(isExpired({ expiresAt: 1_000 }, now)).toBe(true);
    expect(isExpired({ expiresAt: 1_100 }, now)).toBe(false);
    expect(isExpired({ expiresAt: 0 }, now)).toBe(false);
    expect(liveItems([{ expiresAt: 500 }, { expiresAt: 2_000 }], now)).toEqual([
      { expiresAt: 2_000 },
    ]);
  });
});

describe("local seen state", () => {
  const entry = { userId: "1", latestReelMedia: 100 };

  it("marks an entry seen until a newer story appears", () => {
    const seen = markSeenLocal({}, entry);
    expect(isSeenLocally(entry, seen)).toBe(true);
    expect(isSeenLocally({ ...entry, latestReelMedia: 101 }, seen)).toBe(false);
  });

  it("returns the same map when nothing changes", () => {
    const seen = markSeenLocal({}, entry);
    expect(markSeenLocal(seen, entry)).toBe(seen);
  });

  it("treats a missing reel timestamp as zero", () => {
    const seen = markSeenLocal({}, { userId: "2", latestReelMedia: null });
    expect(isSeenLocally({ userId: "2", latestReelMedia: null }, seen)).toBe(true);
  });

  it("caps the number of stored entries keeping the latest", () => {
    let seen: SeenMap = {};
    for (let index = 0; index < MAX_SEEN_ENTRIES + 5; index += 1) {
      seen = markSeenLocal(seen, { userId: `u${index}`, latestReelMedia: 1 });
    }
    expect(Object.keys(seen)).toHaveLength(MAX_SEEN_ENTRIES);
    expect(seen.u0).toBeUndefined();
    expect(seen[`u${MAX_SEEN_ENTRIES + 4}`]).toBe(1);
  });

  it("applies the local map onto tray entries", () => {
    const entries = [
      { userId: "1", latestReelMedia: 100, seen: false },
      { userId: "2", latestReelMedia: 100, seen: false },
    ];
    const result = applySeen(entries, { "1": 100 });
    expect(result.map((item) => item.seen)).toEqual([true, false]);
    expect(result[1]).toBe(entries[1]);
  });

  it("parses stored json defensively", () => {
    expect(parseSeenMap(null)).toEqual({});
    expect(parseSeenMap("nope")).toEqual({});
    expect(parseSeenMap("[1]")).toEqual({});
    expect(parseSeenMap('{"a":1,"b":"x","c":null}')).toEqual({ a: 1 });
  });
});

describe("viewer helpers", () => {
  it("runs the clock only when the media is ready and not held", () => {
    expect(clockRunning("ready", false)).toBe(true);
    expect(clockRunning("ready", true)).toBe(false);
    expect(clockRunning("loading", false)).toBe(false);
    expect(clockRunning("failed", false)).toBe(false);
  });

  it("restarts the first item instead of staying silent", () => {
    expect(backTarget({ group: 0, item: 0 })).toBe("restart");
    expect(backTarget({ group: 0, item: 2 })).toEqual({ group: 0, item: 1 });
    expect(backTarget({ group: 2, item: 0 })).toEqual({ group: 1, item: 0 });
  });

  it("finds the upcoming item", () => {
    expect(upcomingItem(["a", "b"], 0)).toBe("b");
    expect(upcomingItem(["a", "b"], 1)).toBeNull();
  });

  it("picks the slide direction", () => {
    expect(slideDirection(0, 1)).toBe(1);
    expect(slideDirection(2, 1)).toBe(-1);
  });
});
