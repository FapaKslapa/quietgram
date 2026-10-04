import { describe, expect, it } from "vitest";
import { type CookieStore, readInstagramCookies } from "#ext/cookies";

const storeOf = (values: Record<string, string>): CookieStore => ({
  get: async ({ name }) => {
    const value = values[name];
    return value === undefined ? null : { value };
  },
});

describe("readInstagramCookies", () => {
  it("returns the three cookies", async () => {
    const store = storeOf({ sessionid: "s", csrftoken: "c", ds_user_id: "42" });
    expect(await readInstagramCookies(store)).toEqual({
      sessionId: "s",
      csrfToken: "c",
      userId: "42",
    });
  });

  it("returns null without a sessionid", async () => {
    expect(await readInstagramCookies(storeOf({ csrftoken: "c", ds_user_id: "42" }))).toBeNull();
  });

  it("returns null when another cookie is missing", async () => {
    expect(await readInstagramCookies(storeOf({ sessionid: "s", ds_user_id: "42" }))).toBeNull();
    expect(await readInstagramCookies(storeOf({ sessionid: "s", csrftoken: "c" }))).toBeNull();
  });

  it("asks for each cookie on the instagram origin", async () => {
    const requested: string[] = [];
    const store: CookieStore = {
      get: async ({ url, name }) => {
        requested.push(`${url}|${name}`);
        return { value: "x" };
      },
    };
    await readInstagramCookies(store);
    expect(requested.sort()).toEqual([
      "https://www.instagram.com/|csrftoken",
      "https://www.instagram.com/|ds_user_id",
      "https://www.instagram.com/|sessionid",
    ]);
  });
});
