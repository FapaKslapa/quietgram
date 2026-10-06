import { describe, expect, it } from "vitest";
import { backdropOpacity, DISMISS_DISTANCE, shouldDismiss } from "@/lib/viewer";

describe("shouldDismiss", () => {
  it("dismisses after a long drag in either direction", () => {
    expect(shouldDismiss(DISMISS_DISTANCE, 0)).toBe(true);
    expect(shouldDismiss(-DISMISS_DISTANCE, 0)).toBe(true);
  });

  it("dismisses on a fast flick in the direction of the drag", () => {
    expect(shouldDismiss(30, 900)).toBe(true);
    expect(shouldDismiss(-30, -900)).toBe(true);
  });

  it("keeps the viewer on a short slow drag or a fast flick against the drag", () => {
    expect(shouldDismiss(40, 100)).toBe(false);
    expect(shouldDismiss(40, -900)).toBe(false);
  });
});

describe("backdropOpacity", () => {
  it("fades with the drag and never goes negative", () => {
    expect(backdropOpacity(0)).toBe(1);
    expect(backdropOpacity(210)).toBeCloseTo(0.5);
    expect(backdropOpacity(-5000)).toBe(0);
  });
});
