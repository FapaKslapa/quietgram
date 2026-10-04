import { createDb } from "@nodistraction/db";
import { createAuth } from "@/lib/auth/auth";
import { parseEnv } from "@/lib/env";

export const createServices = (cloudflareEnv: CloudflareEnv) => {
  const env = parseEnv({ ...cloudflareEnv });
  const db = createDb(cloudflareEnv.DB);
  return { env, db, auth: createAuth(env, db) };
};
