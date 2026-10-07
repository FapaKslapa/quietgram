import { describe, expect, it } from "vitest";
import {
  adjustCount,
  applyAction,
  type FlagOverride,
  optimisticOverride,
  resolveFlags,
  settleOverride,
  toggleAction,
} from "@/lib/interactions";

const off = { liked: false, saved: false };
const liked = { liked: true, saved: false };

describe("applyAction", () => {
  it("sets one flag at a time", () => {
    expect(applyAction(off, "like")).toEqual(liked);
    expect(applyAction(liked, "unlike")).toEqual(off);
    expect(applyAction(off, "save")).toEqual({ liked: false, saved: true });
    expect(applyAction({ liked: true, saved: true }, "unsave")).toEqual(liked);
  });
});

describe("toggleAction", () => {
  it("flips the current state", () => {
    expect(toggleAction(off, "like")).toBe("like");
    expect(toggleAction(liked, "like")).toBe("unlike");
    expect(toggleAction(off, "save")).toBe("save");
    expect(toggleAction({ liked: false, saved: true }, "save")).toBe("unsave");
  });
});

describe("overrides", () => {
  it("applies optimistically on top of the server value", () => {
    const override = optimisticOverride(off, undefined, "like");
    expect(resolveFlags(off, override)).toEqual(liked);
  });

  it("stacks actions on the current override", () => {
    const first = optimisticOverride(off, undefined, "like");
    const second = optimisticOverride(off, first, "save");
    expect(resolveFlags(off, second)).toEqual({ liked: true, saved: true });
  });

  it("rolls back by restoring the previous override", () => {
    const previous: FlagOverride | undefined = undefined;
    const next = optimisticOverride(off, previous, "like");
    expect(resolveFlags(off, next)).toEqual(liked);
    expect(resolveFlags(off, previous)).toEqual(off);
  });

  it("ignores an override once the server value moved on", () => {
    const override = optimisticOverride(off, undefined, "like");
    expect(resolveFlags({ liked: false, saved: true }, override)).toEqual({
      liked: false,
      saved: true,
    });
  });

  it("settles to the confirmed flags only when an override exists", () => {
    const override = optimisticOverride(off, undefined, "like");
    expect(settleOverride(off, override, liked)).toEqual({ base: off, value: liked });
    expect(settleOverride(off, undefined, liked)).toBeUndefined();
  });
});

describe("adjustCount", () => {
  it("keeps absent counts absent and never goes negative", () => {
    expect(adjustCount(undefined, 1)).toBeUndefined();
    expect(adjustCount(4, 1)).toBe(5);
    expect(adjustCount(0, -1)).toBe(0);
  });
});
