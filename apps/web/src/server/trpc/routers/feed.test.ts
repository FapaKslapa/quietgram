import { feedExceptions, following, mutuals, posts, userSettings } from "@nodistraction/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const media = JSON.stringify([
  { kind: "image", url: "https://example.invalid/i", width: 1, height: 1 },
]);

const seedFeed = async () => {
  const env = await createTestEnv();
  await env.db.insert(following).values([
    { ownerId: "owner", igUserId: "mutual", username: "mutual" },
    { ownerId: "owner", igUserId: "friend", username: "friend" },
    { ownerId: "owner", igUserId: "big", username: "big", followerCount: 50_000 },
    { ownerId: "owner", igUserId: "small", username: "small", followerCount: 10 },
  ]);
  await env.db.insert(mutuals).values({ ownerId: "owner", igUserId: "mutual", username: "mutual" });
  await env.db.insert(feedExceptions).values({ ownerId: "owner", igUserId: "friend" });
  await env.db.insert(posts).values(
    ["mutual", "friend", "big", "small", "stranger"].map((authorId, index) => ({
      id: `p-${authorId}`,
      ownerId: "owner",
      authorId,
      authorUsername: authorId,
      caption: null,
      takenAt: new Date(1_790_000_000_000 + index * 1000),
      mediaJson: media,
    })),
  );
  return { env, caller: createCaller(env.context) };
};

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("feed.list", () => {
  it("includes the author avatar when known", async () => {
    const { env, caller } = await seedFeed();
    await env.db
      .update(following)
      .set({ avatarUrl: "https://example.invalid/a.jpg" })
      .where(eq(following.igUserId, "mutual"));
    const items = (await caller.feed.list({})).items;
    expect(items.find((item) => item.id === "p-mutual")?.authorAvatarUrl).toBe(
      "https://example.invalid/a.jpg",
    );
    expect(items.find((item) => item.id === "p-friend")?.authorAvatarUrl).toBeNull();
  });

  it("shows mutuals and exceptions in friends mode, newest first", async () => {
    const { caller } = await seedFeed();
    const page = await caller.feed.list({});
    expect(ids(page.items)).toEqual(["p-friend", "p-mutual"]);
    expect(page.nextCursor).toBeNull();
  });

  it("shows every followed account in following mode", async () => {
    const { env, caller } = await seedFeed();
    await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "following" });
    expect(ids((await caller.feed.list({})).items)).toEqual([
      "p-small",
      "p-big",
      "p-friend",
      "p-mutual",
    ]);
  });

  it("shows counted creators in creators mode", async () => {
    const { env, caller } = await seedFeed();
    await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "creators" });
    expect(ids((await caller.feed.list({})).items)).toEqual(["p-big"]);
  });

  it("paginates by takenAt", async () => {
    const { env, caller } = await seedFeed();
    await env.db.insert(userSettings).values({ ownerId: "owner", feedMode: "following" });
    const first = await caller.feed.list({ limit: 3 });
    expect(ids(first.items)).toEqual(["p-small", "p-big", "p-friend"]);
    expect(first.nextCursor).toBe(1_790_000_001_000);
    const second = await caller.feed.list({ limit: 3, cursor: first.nextCursor ?? undefined });
    expect(ids(second.items)).toEqual(["p-mutual"]);
    expect(second.nextCursor).toBeNull();
  });

  it("returns an empty page when nobody is allowed", async () => {
    const env = await createTestEnv();
    expect(await createCaller(env.context).feed.list({})).toEqual({ items: [], nextCursor: null });
  });
});
