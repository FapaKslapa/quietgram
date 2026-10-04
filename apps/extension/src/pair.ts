import type { InstagramCookies } from "#ext/cookies";

export type PairResult =
  | { ok: true }
  | { ok: false; reason: "invalid_token" | "rejected" | "network" };

export type PairFetch = (
  input: string,
  init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<{ status: number; ok: boolean }>;

export const pair = async (
  fetcher: PairFetch,
  appOrigin: string,
  token: string,
  cookies: InstagramCookies,
): Promise<PairResult> => {
  try {
    const response = await fetcher(`${appOrigin}/api/pair`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, ...cookies }),
    });
    if (response.ok) return { ok: true };
    return { ok: false, reason: response.status === 401 ? "invalid_token" : "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
};
