import { describe, expect, it } from "vitest";
import { overlapped } from "@/lib/sync/overlapped";

describe("overlapped", () => {
  it("fetches in order while writes run concurrently", async () => {
    const events: string[] = [];
    await overlapped(["a", "b"], async (item) => {
      events.push(`fetch-${item}`);
      return async () => {
        await Promise.resolve();
        events.push(`write-${item}`);
      };
    });
    expect(events.indexOf("fetch-a")).toBeLessThan(events.indexOf("fetch-b"));
    expect(events).toContain("write-a");
    expect(events).toContain("write-b");
  });

  it("keeps the writes already started when a fetch fails", async () => {
    const written: string[] = [];
    const run = overlapped(["a", "b", "c"], async (item) => {
      if (item === "b") throw new Error("boom");
      return async () => {
        written.push(item);
      };
    });
    await expect(run).rejects.toThrow("boom");
    expect(written).toEqual(["a"]);
  });

  it("surfaces a failed write", async () => {
    const run = overlapped(["a"], async () => async () => {
      throw new Error("db");
    });
    await expect(run).rejects.toThrow("db");
  });
});
