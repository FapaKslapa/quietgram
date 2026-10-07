import { createEngineClient, type EngineCredentials, type IgCookies } from "@nodistraction/ig";
import type { AppEnv } from "@/lib/env";

export type CredentialLogin = (
  igUserId: string,
  credentials: EngineCredentials,
) => Promise<IgCookies>;

export const createEngineLogin = (
  env: Pick<AppEnv, "IG_ENGINE_URL" | "IG_ENGINE_SECRET">,
  fetcher?: typeof fetch,
): CredentialLogin | null => {
  const { IG_ENGINE_URL: baseUrl, IG_ENGINE_SECRET: secret } = env;
  if (!baseUrl || !secret) return null;
  return async (igUserId, credentials) => {
    const client = createEngineClient({
      baseUrl,
      secret,
      accountId: igUserId,
      ...(fetcher ? { fetcher } : {}),
    });
    const result = await client.loginWithCredentials(credentials);
    return { sessionId: result.sessionId, csrfToken: result.csrfToken, userId: result.userId };
  };
};
