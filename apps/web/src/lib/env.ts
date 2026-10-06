import { z } from "zod";

const envSchema = z.compile(
  z.object({
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    ALLOWED_EMAILS: z.string().min(3),
    COOKIE_KEY: z.string().min(32),
    BOOTSTRAP_SECRET: z.string().min(16),
    IG_ENGINE_URL: z.url().or(z.literal("")).optional(),
    IG_ENGINE_SECRET: z.string().min(16).or(z.literal("")).optional(),
  }),
);

export type AppEnv = z.output<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  return envSchema.parse(raw);
}
