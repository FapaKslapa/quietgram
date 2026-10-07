import { following, storyTray } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { OWNER } from "@/test/helpers";
import { advance, setup } from "@/test/social-world";

describe("stories.tray", () => {
  it("stores the tray in instagram order and serves it inside the interval", async () => {
    const { env, caller, engineCalls } = await setup();
    const first = await caller.stories.tray();
    expect(first.stale).toBe(false);
    expect(first.entries.map((entry) => entry.userId)).toEqual(["7", "8"]);
    await caller.stories.tray();
    expect(engineCalls("/v1/stories/tray")).toHaveLength(1);
    advance(env.clock, 31_000);
    await caller.stories.tray();
    expect(engineCalls("/v1/stories/tray")).toHaveLength(2);
  });

  it("serves the stored tray flagged stale when the engine fails", async () => {
    const { env, caller, script } = await setup();
    await caller.stories.tray();
    script.fail = true;
    advance(env.clock, 60_000);
    const served = await caller.stories.tray();
    expect(served.stale).toBe(true);
    expect(served.entries).toHaveLength(2);
  });

  it("fails when nothing is stored and the engine fails", async () => {
    const { caller, script } = await setup();
    script.fail = true;
    await expect(caller.stories.tray()).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });

  it("refreshes the avatar of a followed account only when it is older than three days", async () => {
    const { env, caller } = await setup();
    await env.db.insert(following).values([
      {
        ownerId: OWNER,
        igUserId: "7",
        username: "ada",
        avatarUrl: "https://cdn/old.jpg",
        avatarRefreshedAt: new Date(env.clock.current.getTime() - 86_400_000),
      },
      { ownerId: OWNER, igUserId: "8", username: "bob", avatarUrl: "https://cdn/bob.jpg" },
    ]);
    await caller.stories.tray();
    const rows = await env.db.select().from(following).where(eq(following.ownerId, OWNER));
    const byId = new Map(rows.map((row) => [row.igUserId, row]));
    expect(byId.get("7")?.avatarUrl).toBe("https://cdn/old.jpg");
    expect(byId.get("8")?.avatarUrl).toBe("https://cdn/bob.jpg");
    advance(env.clock, 3 * 86_400_000);
    await caller.stories.tray();
    const later = await env.db.select().from(following).where(eq(following.igUserId, "7"));
    expect(later[0]?.avatarUrl).toBe("https://cdn/ada-new.jpg");
    expect(later[0]?.avatarRefreshedAt?.getTime()).toBe(env.clock.current.getTime());
    const stored = await env.db.select().from(storyTray).where(eq(storyTray.ownerId, OWNER));
    expect(stored).toHaveLength(2);
  });

  it("never adds accounts that are not followed", async () => {
    const { env, caller } = await setup();
    await caller.stories.tray();
    expect(await env.db.select().from(following)).toEqual([]);
  });
});

describe("stories.user", () => {
  it("returns the stories without marking anything", async () => {
    const { env, caller } = await setup();
    const stories = await caller.stories.user({ userId: "7" });
    expect(stories[0]).toMatchObject({ id: "s1", productType: "story" });
    expect(env.engineCalls.every((call) => call.method === "GET")).toBe(true);
  });

  it("rejects an invalid user id before any call", async () => {
    const { env, caller } = await setup();
    await expect(caller.stories.user({ userId: "x" })).rejects.toThrow();
    expect(env.engineCalls).toEqual([]);
  });
});
