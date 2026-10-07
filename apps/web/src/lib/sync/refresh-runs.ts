import { posts, syncRuns, syncState } from "@nodistraction/db";
import { IgThrottledError } from "@nodistraction/ig";
import { and, eq, gt, isNull, lt, lte, or } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { RunNotFoundError } from "@/lib/sync/errors";
import { authorsProgress, parseRestoreAt, parseRunState } from "@/lib/sync/run-state";
import { DAY_MS, POST_RETENTION_DAYS } from "@/lib/sync/settings";

export type RefreshProgress = {
  status: "running" | "done" | "failed";
  done: boolean;
  completed: number;
  total: number;
  authors: { checked: number; total: number } | null;
};

export const findRun = async (deps: SyncDeps, ownerId: string, runId: string) => {
  const [run] = await deps.db
    .select()
    .from(syncRuns)
    .where(and(eq(syncRuns.id, runId), eq(syncRuns.ownerId, ownerId)));
  if (!run) throw new RunNotFoundError();
  return run;
};

export const toProgress = (run: {
  status: RefreshProgress["status"];
  completed: number;
  total: number;
  state: string | null;
}): RefreshProgress => ({
  status: run.status,
  done: run.status !== "running",
  completed: run.completed,
  total: run.total,
  authors: run.status === "running" ? authorsProgress(parseRunState(run.state)) : null,
});

const DOUBLE_START_WINDOW_MS = 2 * 60_000;

export const findActiveRun = async (deps: SyncDeps, ownerId: string, now: Date) => {
  const [run] = await deps.db
    .select()
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.ownerId, ownerId),
        eq(syncRuns.kind, "refresh"),
        eq(syncRuns.status, "running"),
        gt(syncRuns.startedAt, new Date(now.getTime() - DOUBLE_START_WINDOW_MS)),
      ),
    );
  return run ?? null;
};

export const restoreMarker = async (
  deps: SyncDeps,
  ownerId: string,
  run: { startedAt: Date; state: string | null },
): Promise<void> => {
  const previous = parseRestoreAt(run.state);
  const lastRefreshAt = previous === null ? null : new Date(previous);
  await deps.db
    .update(syncState)
    .set({ lastRefreshAt })
    .where(and(eq(syncState.ownerId, ownerId), eq(syncState.lastRefreshAt, run.startedAt)));
};

const STEP_LEASE_MS = 60_000;

export const claimCooldown = async (
  deps: SyncDeps,
  ownerId: string,
  now: Date,
  cooldownMs: number,
): Promise<boolean> => {
  await deps.db.insert(syncState).values({ ownerId }).onConflictDoNothing();
  const claimed = await deps.db
    .update(syncState)
    .set({ lastRefreshAt: now })
    .where(
      and(
        eq(syncState.ownerId, ownerId),
        or(
          isNull(syncState.lastRefreshAt),
          lte(syncState.lastRefreshAt, new Date(now.getTime() - cooldownMs)),
        ),
      ),
    )
    .returning({ ownerId: syncState.ownerId });
  return claimed.length > 0;
};

export const claimStep = async (
  deps: SyncDeps,
  ownerId: string,
  run: { id: string; completed: number },
): Promise<boolean> => {
  const now = deps.now();
  const claimed = await deps.db
    .update(syncRuns)
    .set({ leaseUntil: new Date(now.getTime() + STEP_LEASE_MS) })
    .where(
      and(
        eq(syncRuns.id, run.id),
        eq(syncRuns.ownerId, ownerId),
        eq(syncRuns.status, "running"),
        eq(syncRuns.completed, run.completed),
        or(isNull(syncRuns.leaseUntil), lte(syncRuns.leaseUntil, now)),
      ),
    )
    .returning({ id: syncRuns.id });
  return claimed.length > 0;
};

export const failRun = async (
  deps: SyncDeps,
  ownerId: string,
  run: { id: string; startedAt: Date; completed: number; state: string | null },
  error: unknown,
): Promise<void> => {
  await deps.db
    .update(syncRuns)
    .set({ status: "failed", finishedAt: deps.now(), leaseUntil: null })
    .where(eq(syncRuns.id, run.id));
  if (run.completed === 0 && !(error instanceof IgThrottledError)) {
    await restoreMarker(deps, ownerId, run);
  }
};

export const deletePostsBeyondRetention = async (
  deps: SyncDeps,
  ownerId: string,
): Promise<void> => {
  const limit = new Date(deps.now().getTime() - POST_RETENTION_DAYS * DAY_MS);
  await deps.db.delete(posts).where(and(eq(posts.ownerId, ownerId), lt(posts.takenAt, limit)));
};
