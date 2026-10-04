import { describe, expect, it } from "vitest";
import currentUserFixture from "#fixtures/current-user.json" with { type: "json" };
import userInfoFixture from "#fixtures/user-info.json" with { type: "json" };
import { checkSession, fetchUserCounts } from "#ig/account";
import { SessionExpiredError } from "#ig/errors";
import type { Requester } from "#ig/request";

const requesterReturning = (response: unknown) => {
  const calls: { path: string; params: Record<string, string> | undefined }[] = [];
  const requester: Requester = {
    get: async (path, params) => {
      calls.push({ path, params });
      return response;
    },
    postForm: async () => {
      throw new Error("unexpected write");
    },
  };
  return { requester, calls };
};

describe("fetchUserCounts", () => {
  it("reads follower count and flags from the info endpoint", async () => {
    const { requester, calls } = requesterReturning(userInfoFixture);
    expect(await fetchUserCounts(requester, "5099")).toEqual({
      followerCount: 12345,
      isVerified: false,
      isBusiness: true,
    });
    expect(calls).toEqual([{ path: "/api/v1/users/5099/info/", params: undefined }]);
  });

  it("defaults missing flags to false", async () => {
    const { requester } = requesterReturning({ user: { pk: "1", follower_count: 7 } });
    expect(await fetchUserCounts(requester, "1")).toEqual({
      followerCount: 7,
      isVerified: false,
      isBusiness: false,
    });
  });

  it("rejects a malformed response", async () => {
    const { requester } = requesterReturning({ user: {} });
    await expect(fetchUserCounts(requester, "1")).rejects.toThrow();
  });
});

describe("checkSession", () => {
  it("calls the current user endpoint", async () => {
    const { requester, calls } = requesterReturning(currentUserFixture);
    await checkSession(requester);
    expect(calls).toEqual([{ path: "/api/v1/accounts/current_user/", params: { edit: "true" } }]);
  });

  it("propagates an expired session", async () => {
    const requester: Requester = {
      get: async () => {
        throw new SessionExpiredError();
      },
      postForm: async () => undefined,
    };
    await expect(checkSession(requester)).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("rejects a response that is not ok", async () => {
    const { requester } = requesterReturning({ status: "fail" });
    await expect(checkSession(requester)).rejects.toThrow();
  });
});
