import { igSessions } from "@nodistraction/db";
import { describe, expect, it } from "vitest";
import { DM_SEND_ENABLED } from "@/server/config";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";
import { createTestEnv } from "@/test/helpers";

const createCaller = createCallerFactory(appRouter);

describe("messages.send while sending is disabled", () => {
  it("ships with sending switched off", () => {
    expect(DM_SEND_ENABLED).toBe(false);
  });

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

  it("exposes the flag through the overview", async () => {
    const env = await createTestEnv();
    expect((await createCaller(env.context).refresh.overview()).dmSendEnabled).toBe(false);
  });
});
