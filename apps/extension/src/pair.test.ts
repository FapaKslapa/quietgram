import { describe, expect, it } from "vitest";
import { pair } from "#ext/pair";

const cookies = { sessionId: "s", csrfToken: "c", userId: "42" };

const fetcherReturning =
  (status: number) =>
  async (_input: string, init: { body: string }): Promise<{ status: number; ok: boolean }> => {
    calls.push(JSON.parse(init.body));
    return { status, ok: status >= 200 && status < 300 };
  };

const calls: unknown[] = [];

describe("pair", () => {
  it("posts the token and cookies", async () => {
    calls.length = 0;
    const result = await pair(fetcherReturning(200), "http://app.test", "tok", cookies);
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([{ token: "tok", sessionId: "s", csrfToken: "c", userId: "42" }]);
  });

  it("reports an invalid token", async () => {
    expect(await pair(fetcherReturning(401), "http://app.test", "tok", cookies)).toEqual({
      ok: false,
      reason: "invalid_token",
    });
  });

  it("reports other rejections", async () => {
    expect(await pair(fetcherReturning(400), "http://app.test", "tok", cookies)).toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  it("reports network failures", async () => {
    const failing = async (): Promise<never> => {
      throw new TypeError("offline");
    };
    expect(await pair(failing, "http://app.test", "tok", cookies)).toEqual({
      ok: false,
      reason: "network",
    });
  });
});
