import { following } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

const setup = async () => {
  const env = await createTestEnv();
  await env.db
    .insert(following)
    .values({ ownerId: "owner", igUserId: "77", username: "friend_77" });
  return { env, caller: createCaller(env.context) };
};

describe("settings router", () => {
  it("returns defaults", async () => {
    const { caller } = await setup();
    expect(await caller.settings.get()).toEqual({
      feedMode: "friends",
      creatorThreshold: 10000,
      exceptions: [],
    });
  });

  it("rejects anonymous callers", async () => {
    const { env } = await setup();
    const caller = createCaller({ ...env.context, getSession: async () => null });
    await expect(caller.settings.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("stores mode and threshold independently", async () => {
    const { caller } = await setup();
    await caller.settings.setFeedMode({ feedMode: "creators" });
    await caller.settings.setThreshold({ creatorThreshold: 500 });
    expect(await caller.settings.get()).toMatchObject({
      feedMode: "creators",
      creatorThreshold: 500,
    });
    await caller.settings.setFeedMode({ feedMode: "following" });
    expect(await caller.settings.get()).toMatchObject({
      feedMode: "following",
      creatorThreshold: 500,
    });
  });

  it("rejects an unknown mode and a negative threshold", async () => {
    const { caller } = await setup();
    await expect(
      caller.settings.setFeedMode({ feedMode: "everyone" as "friends" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.settings.setThreshold({ creatorThreshold: -1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("adds and removes exceptions for followed accounts only", async () => {
    const { caller } = await setup();
    await caller.settings.addException({ igUserId: "77" });
    await caller.settings.addException({ igUserId: "77" });
    expect((await caller.settings.get()).exceptions).toEqual([
      { igUserId: "77", username: "friend_77" },
    ]);
    await expect(caller.settings.addException({ igUserId: "99" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await caller.settings.removeException({ igUserId: "77" });
    expect((await caller.settings.get()).exceptions).toEqual([]);
  });

  it("lists followed accounts filtered by search, scoped to the owner", async () => {
    const { env, caller } = await setup();
    await env.db.insert(following).values([
      { ownerId: "owner", igUserId: "78", username: "Anna_Rossi" },
      { ownerId: "owner", igUserId: "79", username: "bruno" },
    ]);
    expect((await caller.settings.following({})).map((row) => row.username)).toEqual([
      "Anna_Rossi",
      "bruno",
      "friend_77",
    ]);
    expect(
      (await caller.settings.following({ search: "ANNA" })).map((row) => row.igUserId),
    ).toEqual(["78"]);
    expect(await caller.settings.following({ search: "%" })).toEqual([]);
    expect(await caller.settings.following({ search: "_" })).toEqual([
      { igUserId: "78", username: "Anna_Rossi", avatarUrl: null },
      { igUserId: "77", username: "friend_77", avatarUrl: null },
    ]);
  });
});
