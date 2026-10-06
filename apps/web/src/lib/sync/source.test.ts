import { describe, expect, it } from "vitest";
import { createSessionHandOff, createSourceFactory } from "@/lib/sync/source";
import { ENGINE_SECRET } from "@/test/helpers";

const delay = async (): Promise<void> => {};

describe("createSourceFactory", () => {
  it("chooses the engine when url and secret are set", () => {
    const factory = createSourceFactory(
      { IG_ENGINE_URL: "https://engine.test", IG_ENGINE_SECRET: ENGINE_SECRET },
      delay,
    );
    expect(factory.kind).toBe("engine");
  });

  it.each([
    {},
    { IG_ENGINE_URL: "https://engine.test" },
    { IG_ENGINE_SECRET: ENGINE_SECRET },
    { IG_ENGINE_URL: "", IG_ENGINE_SECRET: "" },
  ])("falls back to the direct client for %j", (env) => {
    expect(createSourceFactory(env, delay).kind).toBe("direct");
  });

  it("builds a direct source without per author posts", () => {
    const source = createSourceFactory({}, delay).create({
      igUserId: "1",
      loadCookies: async () => ({ sessionId: "s", csrfToken: "c", userId: "1" }),
    });
    expect(source).toMatchObject({ kind: "direct", userPosts: null });
  });
});

describe("createSessionHandOff", () => {
  it("is null without engine settings", () => {
    expect(createSessionHandOff({})).toBeNull();
  });

  it("puts the session id for the paired account", async () => {
    const seen: Array<{ url: string; account: string | null; body: unknown }> = [];
    const handOff = createSessionHandOff(
      { IG_ENGINE_URL: "https://engine.test", IG_ENGINE_SECRET: ENGINE_SECRET },
      async (input, init) => {
        seen.push({
          url: String(input),
          account: new Headers(init?.headers).get("x-ig-account-id"),
          body: init?.body,
        });
        return Response.json({ active: true, username: "me" });
      },
    );
    await handOff?.("42", "42%3Aabc");
    expect(seen).toEqual([
      { url: "https://engine.test/v1/session", account: "42", body: '{"sessionid":"42%3Aabc"}' },
    ]);
  });
});
