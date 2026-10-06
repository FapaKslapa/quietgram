import { igSessions } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

describe("messages.send while sending is disabled", () => {
  it("fails with a calm message, no network call and an untouched session", async () => {
    const env = await createTestEnv();
    const caller = createCaller(env.context);
    await expect(caller.messages.send({ threadId: "7127", text: "ciao" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message:
        "L'invio dei messaggi non è ancora disponibile: per ora puoi leggere le conversazioni.",
    });
    expect(env.calls).toEqual([]);
    const [session] = await env.db.select().from(igSessions);
    expect(session?.status).toBe("active");
    expect(session?.updatedAt).toEqual(new Date(0));
  });

  it("validates the text before looking at the setting", async () => {
    const env = await createTestEnv();
    await expect(
      createCaller(env.context).messages.send({ threadId: "7127", text: "   " }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(env.calls).toEqual([]);
  });

  it("exposes the setting through the overview and settings.get", async () => {
    const env = await createTestEnv();
    const caller = createCaller(env.context);
    expect((await caller.refresh.overview()).dmSendEnabled).toBe(false);
    expect((await caller.settings.get()).dmSendEnabled).toBe(false);
  });

  it("turns on and off with setDmSendEnabled", async () => {
    const env = await createTestEnv();
    const caller = createCaller(env.context);
    await caller.settings.setDmSendEnabled({ dmSendEnabled: true });
    expect((await caller.refresh.overview()).dmSendEnabled).toBe(true);
    expect((await caller.settings.get()).dmSendEnabled).toBe(true);
    await caller.settings.setDmSendEnabled({ dmSendEnabled: false });
    expect((await caller.refresh.overview()).dmSendEnabled).toBe(false);
    await expect(caller.messages.send({ threadId: "7127", text: "ciao" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
