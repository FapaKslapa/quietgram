import { createDb } from "@nodistraction/db";
import { parseEnv } from "../env";
import { createAuth } from "./auth";

export const createServices = (cloudflareEnv: CloudflareEnv) => {
  const env = parseEnv({ ...cloudflareEnv });
  const db = createDb(cloudflareEnv.DB);
  return { env, db, auth: createAuth(env, db) };
};
