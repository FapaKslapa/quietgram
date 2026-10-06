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
      dmSendEnabled: false,
      feedMode: "friends",
      creatorThreshold: 10000,
      recencyDays: 14,
      grayscaleMedia: false,
      sessionBudgetMinutes: null,
      budgetLockedUntil: null,
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

  it("stores the recency window and rejects values outside 3..60", async () => {
    const { caller } = await setup();
    await caller.settings.setRecencyDays({ recencyDays: 30 });
    expect(await caller.settings.get()).toMatchObject({ recencyDays: 30, feedMode: "friends" });
    await caller.settings.setRecencyDays({ recencyDays: 3 });
    expect((await caller.settings.get()).recencyDays).toBe(3);
    for (const recencyDays of [2, 61, 7.5]) {
      await expect(caller.settings.setRecencyDays({ recencyDays })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
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

  it("stores the grayscale media flag", async () => {
    const { caller } = await setup();
    await caller.settings.setGrayscaleMedia({ grayscaleMedia: true });
    expect((await caller.settings.get()).grayscaleMedia).toBe(true);
    await caller.settings.setGrayscaleMedia({ grayscaleMedia: false });
    expect((await caller.settings.get()).grayscaleMedia).toBe(false);
  });

  it("stores the session budget, allows turning it off and rejects other values", async () => {
    const { caller } = await setup();
    await caller.settings.setSessionBudget({ sessionBudgetMinutes: 15 });
    expect((await caller.settings.get()).sessionBudgetMinutes).toBe(15);
    await caller.settings.setSessionBudget({ sessionBudgetMinutes: null });
    expect((await caller.settings.get()).sessionBudgetMinutes).toBeNull();
    for (const sessionBudgetMinutes of [0, 7, 45, 5.5]) {
      await expect(
        caller.settings.setSessionBudget({ sessionBudgetMinutes }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("locks the budget for sixty minutes from the server clock", async () => {
    const { env, caller } = await setup();
    await expect(caller.settings.lockBudget()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await caller.settings.setSessionBudget({ sessionBudgetMinutes: 10 });
    const { budgetLockedUntil } = await caller.settings.lockBudget();
    expect(budgetLockedUntil).toBe(env.context.sync.now().getTime() + 3_600_000);
    expect((await caller.settings.get()).budgetLockedUntil).toBe(budgetLockedUntil);
  });
});
