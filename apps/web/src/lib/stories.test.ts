import { describe, expect, it } from "vitest";
import {
  advanceElapsed,
  classifyRelease,
  IMAGE_DURATION_MS,
  isComplete,
  isExpired,
  itemDuration,
  liveItems,
  MAX_VIDEO_DURATION_MS,
  nextCursor,
  orderTray,
  previousCursor,
  ringState,
  segmentFill,
  storyProgress,
  tapZone,
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
