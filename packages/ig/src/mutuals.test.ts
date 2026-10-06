import { describe, expect, it } from "vitest";
import followingFixture from "#fixtures/following.json" with { type: "json" };
import { computeMutuals, fetchAllUsers, fetchUsersPage } from "#ig/mutuals";
import type { Requester } from "#ig/request";

const u = (id: string) => ({
  id,
  username: `u${id}`,
  avatarUrl: null,
  isVerified: false,
  latestReelMedia: null,
});

const pagedRequester = (pages: unknown[]) => {
  const calls: { path: string; params: Record<string, string> | undefined }[] = [];
  const requester: Requester = {
    get: async (path, params) => {
      calls.push({ path, params });
      return pages[calls.length - 1];
    },
    postForm: async () => {
      throw new Error("unexpected write");
    },
  };
  return { requester, calls };
};

describe("computeMutuals", () => {
  it("intersects following and followers", () => {
    expect(computeMutuals([u("1"), u("2")], [u("2"), u("3")])).toEqual([u("2")]);
  });

  it("returns empty when nothing overlaps", () => {
    expect(computeMutuals([u("1")], [u("2")])).toEqual([]);
  });

  it("returns empty when the user follows nobody", () => {
    expect(computeMutuals([], [u("1")])).toEqual([]);
  });
});

describe("fetchAllUsers", () => {
  it("follows next_max_id across pages", async () => {
    const { requester, calls } = pagedRequester([
      {
        users: [
          { pk: 1, username: "a", profile_pic_url: "https://example.invalid/a", is_verified: true },
        ],
        next_max_id: "c1",
      },
      { users: [{ pk: "2", username: "b" }], next_max_id: null },
    ]);
    const users = await fetchAllUsers(requester, "following", "42");
    expect(users).toEqual([
      {
        id: "1",
        username: "a",
        avatarUrl: "https://example.invalid/a",
        isVerified: true,
        latestReelMedia: null,
      },
      { id: "2", username: "b", avatarUrl: null, isVerified: false, latestReelMedia: null },
    ]);
    expect(calls.map((c) => c.path)).toEqual([
      "/api/v1/friendships/42/following/",
      "/api/v1/friendships/42/following/",
    ]);
    expect(calls[0]?.params).toEqual({ count: "200" });
    expect(calls[1]?.params).toEqual({ count: "200", max_id: "c1" });
  });

  it("parses a recorded following page", async () => {
    const { requester } = pagedRequester([{ ...followingFixture, next_max_id: null }]);
    const users = await fetchAllUsers(requester, "followers", "42");
    expect(users.length).toBe(followingFixture.users.length);
    expect(users[0]?.username).toBe(followingFixture.users[0]?.username);
    expect(users[0]?.avatarUrl).toMatch(/^https:\/\/example\.invalid\//);
  });

  it("rejects a malformed page", async () => {
    const { requester } = pagedRequester([{ users: "nope" }]);
    await expect(fetchAllUsers(requester, "following", "42")).rejects.toThrow();
  });
});

describe("fetchUsersPage", () => {
  it("returns one page with its cursor", async () => {
    const { requester, calls } = pagedRequester([
      { users: [{ pk: "2", username: "b" }], next_max_id: "c2" },
    ]);
    const page = await fetchUsersPage(requester, "followers", "42", "c1");
    expect(page).toEqual({
      users: [
        { id: "2", username: "b", avatarUrl: null, isVerified: false, latestReelMedia: null },
      ],
      nextCursor: "c2",
    });
    expect(calls[0]?.params).toEqual({ count: "200", max_id: "c1" });
  });

  it("returns a null cursor on the last page", async () => {
    const { requester } = pagedRequester([{ users: [], next_max_id: null }]);
    expect((await fetchUsersPage(requester, "following", "42")).nextCursor).toBeNull();
  });
});
