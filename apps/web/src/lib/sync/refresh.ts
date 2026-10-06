import { igSessions, posts, syncRuns, syncState } from "@nodistraction/db";
import { IgThrottledError, SessionExpiredError } from "@nodistraction/ig";
import { and, eq, gt, lt } from "drizzle-orm";
import { startAuthorsPhase, stepAuthors } from "@/lib/sync/authors";
import { REFRESH_COOLDOWN_MS, remainingCooldownMs } from "@/lib/sync/cooldown";
import { refreshCounts } from "@/lib/sync/counts";
import type { SyncDeps } from "@/lib/sync/deps";
import { CooldownError, NoSessionError, RunNotFoundError } from "@/lib/sync/errors";
import {
  hasStoredFollowing,
  mutualsAreStale,
  stepFollowers,
  stepFollowing,
} from "@/lib/sync/graph";
import {
  authorsProgress,
  parseRestoreAt,
  parseRunState,
  type RunState,
  remainingSteps,
  serializeRunState,
} from "@/lib/sync/run-state";
import { withIgSession } from "@/lib/sync/session";
import { DAY_MS, loadSettings, POST_RETENTION_DAYS } from "@/lib/sync/settings";
import { stepTimeline } from "@/lib/sync/timeline";

export type RefreshProgress = {
  status: "running" | "done" | "failed";
  done: boolean;
  completed: number;
  total: number;
  authors: { checked: number; total: number } | null;
};

const initialState = async (deps: SyncDeps, ownerId: string, stale: boolean): Promise<RunState> => {
  if (stale) return { phase: "following", cursor: null, ids: [] };
  return deps.source.kind === "engine"
    ? startAuthorsPhase(deps, ownerId)
    : { phase: "timeline", cursor: null, page: 0 };
};

const findRun = async (deps: SyncDeps, ownerId: string, runId: string) => {
  const [run] = await deps.db
    .select()
    .from(syncRuns)
    .where(and(eq(syncRuns.id, runId), eq(syncRuns.ownerId, ownerId)));
  if (!run) throw new RunNotFoundError();
  return run;
};

const toProgress = (run: {
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

const findActiveRun = async (deps: SyncDeps, ownerId: string, now: Date) => {
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

export const startRefresh = async (
  deps: SyncDeps,
  ownerId: string,
  cooldownMs: number = REFRESH_COOLDOWN_MS,
): Promise<{ runId: string; total: number }> => {
  const now = deps.now();
  const active = await findActiveRun(deps, ownerId, now);
  if (active) return { runId: active.id, total: active.total };
  const [state] = await deps.db.select().from(syncState).where(eq(syncState.ownerId, ownerId));
  const remaining = remainingCooldownMs(state?.lastRefreshAt ?? null, now, cooldownMs);
  if (remaining > 0) throw new CooldownError(Math.ceil(remaining / 1000));

  const [session] = await deps.db
    .select({ status: igSessions.status })
    .from(igSessions)
    .where(eq(igSessions.ownerId, ownerId));
  if (!session) throw new NoSessionError();
  if (session.status === "expired") throw new SessionExpiredError();

  const { feedMode } = await loadSettings(deps.db, ownerId);
  const first = await initialState(
    deps,
    ownerId,
    mutualsAreStale(
      state?.mutualsRefreshedAt ?? null,
      now,
      await hasStoredFollowing(deps, ownerId),
    ),
  );
  const total = remainingSteps(first, feedMode, deps.source.kind);
  const runId = crypto.randomUUID();
  await deps.db.insert(syncRuns).values({
    id: runId,
    ownerId,
    startedAt: now,
    kind: "refresh",
    status: "running",
    total,
    completed: 0,
    state: serializeRunState(first, state?.lastRefreshAt?.getTime() ?? null),
  });
  await deps.db
    .insert(syncState)
    .values({ ownerId, lastRefreshAt: now })
    .onConflictDoUpdate({ target: syncState.ownerId, set: { lastRefreshAt: now } });
  return { runId, total };
};

export const getRefreshStatus = async (
  deps: SyncDeps,
  ownerId: string,
  runId: string,
): Promise<RefreshProgress> => toProgress(await findRun(deps, ownerId, runId));

const restoreMarker = async (
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

const failRun = async (
  deps: SyncDeps,
  ownerId: string,
  run: { id: string; startedAt: Date; completed: number; state: string | null },
  error: unknown,
): Promise<void> => {
  await deps.db
    .update(syncRuns)
    .set({ status: "failed", finishedAt: deps.now() })
    .where(eq(syncRuns.id, run.id));
  if (run.completed === 0 && !(error instanceof IgThrottledError)) {
    await restoreMarker(deps, ownerId, run);
  }
};

const deletePostsBeyondRetention = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  const limit = new Date(deps.now().getTime() - POST_RETENTION_DAYS * DAY_MS);
  await deps.db.delete(posts).where(and(eq(posts.ownerId, ownerId), lt(posts.takenAt, limit)));
};

export const runRefreshStep = async (
  deps: SyncDeps,
  ownerId: string,
  runId: string,
): Promise<RefreshProgress> => {
  const run = await findRun(deps, ownerId, runId);
  if (run.status !== "running") return toProgress(run);

  const state = parseRunState(run.state);
  const { feedMode } = await loadSettings(deps.db, ownerId);

  let next: RunState | null;
  try {
    next = await withIgSession(deps, ownerId, async ({ source, igUserId }) => {
      switch (state.phase) {
        case "following":
          return stepFollowing(deps, ownerId, source, igUserId, state);
        case "followers":
          return stepFollowers(deps, ownerId, source, igUserId, state);
        case "timeline":
          return stepTimeline(deps, ownerId, source, state, feedMode);
        case "authors":
          return stepAuthors(deps, ownerId, source, state, feedMode);
        case "counts":
          await refreshCounts(deps, ownerId, source);
          return null;
      }
    });
  } catch (error) {
    await failRun(deps, ownerId, run, error);
    throw error;
  }

  const completed = run.completed + 1;
  const finished = next === null;
  if (finished) await deletePostsBeyondRetention(deps, ownerId);
  const total = completed + remainingSteps(next, feedMode, deps.source.kind);
  await deps.db
    .update(syncRuns)
    .set({
      completed,
      total,
      state: next ? serializeRunState(next, parseRestoreAt(run.state)) : null,
      status: finished ? "done" : "running",
      finishedAt: finished ? deps.now() : null,
    })
    .where(eq(syncRuns.id, runId));
  return {
    status: finished ? "done" : "running",
    done: finished,
    completed,
    total,
    authors: authorsProgress(next),
  };
};
