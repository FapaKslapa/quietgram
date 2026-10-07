import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetRun,
  markInterrupted,
  recallRun,
  rememberRun,
  takeInterrupted,
} from "@/lib/refresh-resume";

const memory = (): Storage => {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
};

describe("refresh resume", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", memory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers and forgets the running run", () => {
    expect(recallRun()).toBeNull();
    rememberRun("run-1");
    expect(recallRun()).toBe("run-1");
    forgetRun();
    expect(recallRun()).toBeNull();
  });

  it("reports an interruption once", () => {
    expect(takeInterrupted()).toBe(false);
    markInterrupted();
    expect(takeInterrupted()).toBe(true);
    expect(takeInterrupted()).toBe(false);
  });

  it("degrades silently when storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(() => rememberRun("run-1")).not.toThrow();
    expect(recallRun()).toBeNull();
    expect(takeInterrupted()).toBe(false);
  });
});
