import { describe, expect, it } from "vitest";
import { sequentially } from "@/lib/sync/sequentially";

describe("sequentially", () => {
  it("runs each task only after the previous one has finished", async () => {
    const events: string[] = [];
    const task = async (item: number) => {
      events.push(`start ${item}`);
      await new Promise((resolve) => setTimeout(resolve, 5 - item));
      events.push(`end ${item}`);
    };
    await sequentially([1, 2, 3], task);
    expect(events).toEqual(["start 1", "end 1", "start 2", "end 2", "start 3", "end 3"]);
  });

  it("stops at the first failure", async () => {
    const seen: number[] = [];
    const task = async (item: number) => {
      seen.push(item);
      if (item === 2) throw new Error("boom");
    };
    await expect(sequentially([1, 2, 3], task)).rejects.toThrow("boom");
    expect(seen).toEqual([1, 2]);
  });

  it("resolves for an empty list", async () => {
    await expect(sequentially([], async () => undefined)).resolves.toBeUndefined();
  });
});
