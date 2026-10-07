import { SessionExpiredError } from "@nodistraction/ig";
import { NoSessionError } from "@/lib/sync/errors";
import { logError } from "@/server/log";
import { shortReason } from "@/server/trpc/errors";

export type Served<T> = { value: T; stale: boolean };

export const serveWithFallback = async <T>(
  path: string,
  fetch: () => Promise<T>,
  cached: () => Promise<T | null>,
): Promise<Served<T>> => {
  try {
    return { value: await fetch(), stale: false };
  } catch (error) {
    if (error instanceof SessionExpiredError || error instanceof NoSessionError) throw error;
    const fallback = await cached();
    if (fallback === null) throw error;
    logError({
      path,
      code: "STALE",
      message: shortReason(error) ?? "sync failed",
      cause: error instanceof Error ? error.name : undefined,
    });
    return { value: fallback, stale: true };
  }
};
