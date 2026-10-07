import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  MAX_PASSWORD_LENGTH,
  normalizeUsername,
  TOTP_SECRET_PATTERN,
  USERNAME_PATTERN,
} from "@/lib/credentials/form";
import { manualLogin } from "@/lib/credentials/manual-login";
import {
  type CredentialStatus,
  loadCredentialStatus,
  removeCredentials,
  saveCredentials,
  setCredentialState,
} from "@/lib/credentials/vault";
import { guarded } from "@/server/trpc/errors";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";

const statusOutput = z.compile(
  z.object({
    configured: z.boolean(),
    username: z.string().nullable(),
    state: z.enum(["ready", "challenge", "rejected"]).nullable(),
  }),
);

const saveInput = z.compile(
  z.object({
    username: z.string().transform(normalizeUsername).pipe(z.string().regex(USERNAME_PATTERN)),
    password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    totpSecret: z.string().trim().regex(TOTP_SECRET_PATTERN).optional(),
  }),
);

const loginInput = z.compile(
  z.object({
    username: z.string().transform(normalizeUsername).pipe(z.string().regex(USERNAME_PATTERN)),
    password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    totpSecret: z.string().trim().regex(TOTP_SECRET_PATTERN).optional(),
    remember: z.boolean(),
  }),
);

const loginOutput = z.compile(z.object({ sessionStatus: z.literal("active"), saved: z.boolean() }));

export const credentialsRouter = createTRPCRouter({
  status: protectedProcedure
    .output(statusOutput)
    .query(({ ctx }) => loadCredentialStatus(ctx.db, ctx.session.user.id)),

  save: protectedProcedure
    .input(saveInput)
    .output(statusOutput)
    .mutation(async ({ ctx, input }): Promise<CredentialStatus> => {
      const ownerId = ctx.session.user.id;
      await saveCredentials(ctx.db, ctx.sync.getCookieKey(), ownerId, input, ctx.sync.now());
      return loadCredentialStatus(ctx.db, ownerId);
    }),

  login: protectedProcedure
    .input(loginInput)
    .output(loginOutput)
    .mutation(({ ctx, input }) =>
      guarded(async () => {
        const { remember, ...credentials } = input;
        await manualLogin(syncDepsOf(ctx), ctx.session.user.id, credentials, remember);
        return { sessionStatus: "active" as const, saved: remember };
      }),
    ),

  resume: protectedProcedure.output(statusOutput).mutation(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const current = await loadCredentialStatus(ctx.db, ownerId);
    if (!current.configured) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Accesso automatico non attivo",
      });
    }
    await setCredentialState(ctx.db, ownerId, "ready", ctx.sync.now());
    return loadCredentialStatus(ctx.db, ownerId);
  }),

  remove: protectedProcedure.output(statusOutput).mutation(async ({ ctx }) => {
    await removeCredentials(ctx.db, ctx.session.user.id);
    return loadCredentialStatus(ctx.db, ctx.session.user.id);
  }),
});
