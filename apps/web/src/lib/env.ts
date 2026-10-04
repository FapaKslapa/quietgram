import { z } from "zod";

const envSchema = z.compile(
  z.object({
    BETTER_AUTH_SECRET: z.string().min(32),
    ALLOWED_EMAILS: z.string().min(3),
    COOKIE_KEY: z.string().min(32),
    BOOTSTRAP_SECRET: z.string().min(16),
  }),
);

export type AppEnv = z.output<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  return envSchema.parse(raw);
}
