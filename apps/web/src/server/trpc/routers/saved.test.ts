import { SessionExpiredError } from "@nodistraction/ig";
import savedFixture from "@nodistraction/ig/fixtures/saved.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const item = (pk: string, username: string) => ({
  media: {
    pk,
    product_type: "feed",
    taken_at: 1_790_000_000,
    user: { pk: "1", username },
    caption: null,
    image_versions2: { candidates: [{ url: "https://example.invalid/i", width: 1, height: 1 }] },
  },
});

describe("saved router", () => {
  it("replaces stored rows and keeps instagram order", async () => {
    let response: unknown = { items: [item("b", "u_b"), item("a", "u_a"), item("c", "u_c")] };
    const env = await createTestEnv(() => response);
    const caller = createCaller(env.context);
    await caller.saved.sync();
    expect((await caller.saved.list()).map((post) => post.id)).toEqual(["b", "a", "c"]);
    response = { items: [item("c", "u_c"), item("d", "u_d")] };
    await caller.saved.sync();
    expect((await caller.saved.list()).map((post) => post.id)).toEqual(["c", "d"]);
  });

  it("keeps reels from the recorded page", async () => {
    const env = await createTestEnv(() => savedFixture);
    const caller = createCaller(env.context);
    await caller.saved.sync();
    expect(await caller.saved.list()).toHaveLength(3);
  });

  it("reports an expired session and keeps stored rows", async () => {
    let fail = false;
    const env = await createTestEnv(() => {
      if (fail) throw new SessionExpiredError();
      return { items: [item("a", "u_a")] };
    });
    const caller = createCaller(env.context);
    await caller.saved.sync();
    fail = true;
    await expect(caller.saved.sync()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await caller.saved.list()).toHaveLength(1);
  });

  it("rejects anonymous callers", async () => {
    const env = await createTestEnv();
    const caller = createCaller({ ...env.context, getSession: async () => null });
    await expect(caller.saved.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
