import { describe, expect, it } from "vitest";
import { chunk, chunkRows } from "@/lib/sync/chunk";

describe("chunk", () => {
  it("splits into fixed size groups", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns nothing for an empty list", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("chunkRows", () => {
  it("keeps bound parameters under the D1 limit", () => {
    const rows = Array.from({ length: 45 }, (_, index) => index);
    const groups = chunkRows(rows, 8);
    expect(groups.every((group) => group.length * 8 <= 100)).toBe(true);
    expect(groups.flat()).toEqual(rows);
  });
});
