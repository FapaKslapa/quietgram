import { igSessions, syncRuns, syncState } from "@nodistraction/db";
import { SessionExpiredError } from "@nodistraction/ig";
import { and, eq } from "drizzle-orm";
import { startAuthorsPhase, stepAuthors } from "@/lib/sync/authors";
import { remainingCooldownMs } from "@/lib/sync/cooldown";
import { refreshCounts } from "@/lib/sync/counts";
import type { SyncDeps } from "@/lib/sync/deps";
import { CooldownError, NoSessionError } from "@/lib/sync/errors";
import {
  hasStoredFollowing,
  mutualsAreStale,
  stepFollowers,
  stepFollowing,
} from "@/lib/sync/graph";
import type { SyncLimits } from "@/lib/sync/limits";
import { loadLimits } from "@/lib/sync/profile-mode";
import {
  claimCooldown,
  claimStep,
  deletePostsBeyondRetention,
  failRun,
  findActiveRun,
  findRun,
  type RefreshProgress,
  restoreMarker,
  toProgress,
} from "@/lib/sync/refresh-runs";
import {
  authorsProgress,
  parseRestoreAt,
  parseRunState,
  type RunState,
  remainingSteps,
  serializeRunState,
} from "@/lib/sync/run-state";
import { withIgSession } from "@/lib/sync/session";
import { loadSettings } from "@/lib/sync/settings";
import { stepTimeline } from "@/lib/sync/timeline";

export type { RefreshProgress };

const initialState = async (
  deps: SyncDeps,
  ownerId: string,
  stale: boolean,
  limits: SyncLimits,
): Promise<RunState> => {
  if (stale) return { phase: "following", cursor: null, ids: [] };
  return deps.source.kind === "engine"
    ? startAuthorsPhase(deps, ownerId, limits)
    : { phase: "timeline", cursor: null, page: 0 };
};

export const startRefresh = async (
  deps: SyncDeps,
  ownerId: string,
  cooldownOverride?: number,
): Promise<{ runId: string; total: number }> => {
  const now = deps.now();
  const limits = await loadLimits(deps, ownerId);
  const cooldownMs = cooldownOverride ?? limits.cooldownMs;
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

  const [{ feedMode }, storedFollowing] = await Promise.all([
    loadSettings(deps.db, ownerId),
    hasStoredFollowing(deps, ownerId),
  ]);
  const first = await initialState(
    deps,
    ownerId,
    mutualsAreStale(state?.mutualsRefreshedAt ?? null, now, storedFollowing),
    limits,
  );
  const total = remainingSteps(first, feedMode, deps.source.kind, limits);
  if (!(await claimCooldown(deps, ownerId, now, cooldownMs))) {
    const concurrent = await findActiveRun(deps, ownerId, now);
    if (concurrent) return { runId: concurrent.id, total: concurrent.total };
    const [latest] = await deps.db.select().from(syncState).where(eq(syncState.ownerId, ownerId));
    const wait = remainingCooldownMs(latest?.lastRefreshAt ?? null, now, cooldownMs);
    throw new CooldownError(Math.max(1, Math.ceil(wait / 1000)));
  }
  const runId = crypto.randomUUID();
  try {
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
  } catch (error) {
    await restoreMarker(deps, ownerId, {
      startedAt: now,
      state: serializeRunState(first, state?.lastRefreshAt?.getTime() ?? null),
    });
    throw error;
  }
  return { runId, total };
};

export const getRefreshStatus = async (
  deps: SyncDeps,
  ownerId: string,
  runId: string,
): Promise<RefreshProgress> => toProgress(await findRun(deps, ownerId, runId));

export const runRefreshStep = async (
  deps: SyncDeps,
  ownerId: string,
  runId: string,
): Promise<RefreshProgress> => {
  const run = await findRun(deps, ownerId, runId);
  if (run.status !== "running") return toProgress(run);

  if (!(await claimStep(deps, ownerId, run))) {
    return toProgress(await findRun(deps, ownerId, runId));
  }

  const state = parseRunState(run.state);
  const [{ feedMode }, limits] = await Promise.all([
    loadSettings(deps.db, ownerId),
    loadLimits(deps, ownerId),
  ]);

  let next: RunState | null;
  try {
    next = await withIgSession(deps, ownerId, async ({ source, igUserId }) => {
      switch (state.phase) {
        case "following":
          return stepFollowing(deps, ownerId, source, igUserId, state);
        case "followers":
          return stepFollowers(deps, ownerId, source, igUserId, state, limits);
        case "timeline":
          return stepTimeline(deps, ownerId, source, state, feedMode);
        case "authors":
          return stepAuthors(deps, ownerId, source, state, feedMode, limits);
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
  const total = completed + remainingSteps(next, feedMode, deps.source.kind, limits);
  const advanced = await deps.db
    .update(syncRuns)
    .set({
      completed,
      total,
      state: next ? serializeRunState(next, parseRestoreAt(run.state)) : null,
      status: finished ? "done" : "running",
      finishedAt: finished ? deps.now() : null,
      leaseUntil: null,
    })
    .where(
      and(
        eq(syncRuns.id, runId),
        eq(syncRuns.status, "running"),
        eq(syncRuns.completed, run.completed),
      ),
    )
    .returning({ id: syncRuns.id });
  if (advanced.length === 0) return toProgress(await findRun(deps, ownerId, runId));
  return {
    status: finished ? "done" : "running",
    done: finished,
    completed,
    total,
    authors: authorsProgress(next),
  };
};
