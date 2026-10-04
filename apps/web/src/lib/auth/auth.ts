import { passkey } from "@better-auth/passkey";
import { type Db, schema } from "@nodistraction/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import type { AppEnv } from "../env";
import { canBootstrap, isAllowed } from "./allowlist";
import { BOOTSTRAP_HEADER } from "./bootstrap";

export const createAuth = (env: AppEnv, db: Db) => {
  const url = new URL(env.BETTER_AUTH_URL);

  return betterAuth({
    baseURL: url.origin,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    databaseHooks: {
      user: {
        create: {
          before: async (candidate) => {
            if (!isAllowed(candidate.email, env.ALLOWED_EMAILS)) {
              throw APIError.from("FORBIDDEN", {
                code: "EMAIL_NOT_ALLOWED",
                message: "Email not allowed",
              });
            }
          },
        },
      },
    },
    plugins: [
      passkey({
        rpID: url.hostname,
        rpName: "nodistraction",
        origin: url.origin,
        registration: {
          requireSession: false,
          resolveUser: async ({ ctx, context }) => {
            const email = (context ?? "").trim().toLowerCase();
            const secret = ctx.headers?.get(BOOTSTRAP_HEADER) ?? null;
            if (
              !canBootstrap(
                { email, secret },
                { allowedEmails: env.ALLOWED_EMAILS, bootstrapSecret: env.BOOTSTRAP_SECRET },
              )
            ) {
              throw APIError.from("FORBIDDEN", {
                code: "BOOTSTRAP_DENIED",
                message: "Registration denied",
              });
            }
            const existing = await ctx.context.internalAdapter.findUserByEmail(email);
            const account =
              existing?.user ??
              (await ctx.context.internalAdapter.createUser(
                { email, name: email, emailVerified: true },
                { method: "passkey" },
              ));
            const registered = await ctx.context.adapter.findOne({
              model: "passkey",
              where: [{ field: "userId", value: account.id }],
            });
            if (registered) {
              throw APIError.from("FORBIDDEN", {
                code: "BOOTSTRAP_DENIED",
                message: "Registration denied",
              });
            }
            return { id: account.id, name: email, displayName: email };
          },
        },
      }),
    ],
  });
};

export type Auth = ReturnType<typeof createAuth>;
