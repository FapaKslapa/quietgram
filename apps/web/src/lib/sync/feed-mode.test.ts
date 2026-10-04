import { describe, expect, it } from "vitest";
import { type FollowingRow, resolveAllowedAuthors } from "@/lib/sync/feed-mode";

const row = (igUserId: string, overrides: Partial<FollowingRow> = {}): FollowingRow => ({
  igUserId,
  followerCount: null,
  isVerified: false,
  isBusiness: false,
  ...overrides,
});

const following = [
  row("mutual"),
  row("friend"),
  row("big", { followerCount: 50_000 }),
  row("small", { followerCount: 100 }),
  row("exact", { followerCount: 10_000 }),
  row("unknown"),
  row("verified", { isVerified: true }),
  row("business", { isBusiness: true }),
];

const resolve = (
  mode: "friends" | "following" | "creators",
  overrides: { exceptionIds?: string[]; mutualIds?: string[]; threshold?: number } = {},
) =>
  resolveAllowedAuthors({
    mode,
    following,
    mutualIds: new Set(overrides.mutualIds ?? ["mutual"]),
    exceptionIds: new Set(overrides.exceptionIds ?? []),
    threshold: overrides.threshold ?? 10_000,
  });

describe("resolveAllowedAuthors", () => {
  it("friends returns mutuals only without exceptions", () => {
    expect(resolve("friends")).toEqual(new Set(["mutual"]));
  });

  it("friends adds exceptions that are followed", () => {
    expect(resolve("friends", { exceptionIds: ["friend", "stranger"] })).toEqual(
      new Set(["mutual", "friend"]),
    );
  });

  it("friends with no mutuals is empty", () => {
    expect(resolve("friends", { mutualIds: [] })).toEqual(new Set());
  });

  it("following returns every followed account and ignores exceptions", () => {
    const allowed = resolve("following", { exceptionIds: ["stranger"] });
    expect(allowed).toEqual(new Set(following.map((entry) => entry.igUserId)));
  });

  it("creators keeps counts at or above the threshold, verified and business", () => {
    expect(resolve("creators")).toEqual(new Set(["big", "exact", "verified", "business"]));
  });

  it("creators excludes unknown counts and ignores exceptions", () => {
    const allowed = resolve("creators", { exceptionIds: ["unknown", "friend"] });
    expect(allowed.has("unknown")).toBe(false);
    expect(allowed.has("friend")).toBe(false);
  });

  it("creators honors the threshold", () => {
    expect(resolve("creators", { threshold: 100 }).has("small")).toBe(true);
    expect(resolve("creators", { threshold: 60_000 }).has("big")).toBe(false);
  });
});
