import { postState, saved } from "@nodistraction/db";
import { validateCommentText } from "@nodistraction/ig";
import { and, eq } from "drizzle-orm";
import type { SyncDeps } from "@/lib/sync/deps";
import { InteractionsDisabledError } from "@/lib/sync/errors";
import { clearMark } from "@/lib/sync/marks";
import { SAVED_SCOPE } from "@/lib/sync/saved";
import { withIgSession } from "@/lib/sync/session";
import { loadInteractionsEnabled } from "@/lib/sync/settings";
import type { InstagramSource } from "@/lib/sync/source";

export type PostFlags = { liked: boolean; saved: boolean };

export type Toggle = "like" | "unlike" | "save" | "unsave";

const patches: Record<Toggle, Partial<PostFlags>> = {
  like: { liked: true },
  unlike: { liked: false },
  save: { saved: true },
  unsave: { saved: false },
};

const calls: Record<Toggle, (source: InstagramSource, mediaId: string) => Promise<void>> = {
  like: (source, mediaId) => source.like(mediaId),
  unlike: (source, mediaId) => source.unlike(mediaId),
  save: (source, mediaId) => source.save(mediaId),
  unsave: (source, mediaId) => source.unsave(mediaId),
};

const assertEnabled = async (deps: SyncDeps, ownerId: string): Promise<void> => {
  if (!(await loadInteractionsEnabled(deps.db, ownerId))) throw new InteractionsDisabledError();
};

const readFlags = async (deps: SyncDeps, ownerId: string, mediaId: string) => {
  const [row] = await deps.db
    .select()
    .from(postState)
    .where(and(eq(postState.ownerId, ownerId), eq(postState.mediaId, mediaId)));
  return row ? { liked: row.liked, saved: row.saved } : null;
};

const writeFlags = async (
  deps: SyncDeps,
  ownerId: string,
  mediaId: string,
  flags: PostFlags,
): Promise<void> => {
  const updatedAt = deps.now();
  await deps.db
    .insert(postState)
    .values({ ownerId, mediaId, ...flags, updatedAt })
    .onConflictDoUpdate({
      target: [postState.ownerId, postState.mediaId],
      set: { ...flags, updatedAt },
    });
};

const clearFlags = async (deps: SyncDeps, ownerId: string, mediaId: string): Promise<void> => {
  await deps.db
    .delete(postState)
    .where(and(eq(postState.ownerId, ownerId), eq(postState.mediaId, mediaId)));
};

export const toggle = async (
  deps: SyncDeps,
  ownerId: string,
  mediaId: string,
  action: Toggle,
): Promise<PostFlags> => {
  await assertEnabled(deps, ownerId);
  const previous = await readFlags(deps, ownerId, mediaId);
  const next: PostFlags = { liked: false, saved: false, ...previous, ...patches[action] };
  await writeFlags(deps, ownerId, mediaId, next);
  try {
    await withIgSession(deps, ownerId, ({ source }) => calls[action](source, mediaId));
  } catch (error) {
    if (previous) await writeFlags(deps, ownerId, mediaId, previous);
    else await clearFlags(deps, ownerId, mediaId);
    throw error;
  }
  if (action === "unsave") {
    await deps.db.delete(saved).where(and(eq(saved.ownerId, ownerId), eq(saved.id, mediaId)));
  }
  if (action === "save" || action === "unsave") await clearMark(deps, ownerId, SAVED_SCOPE);
  return next;
};

export const postComment = async (
  deps: SyncDeps,
  ownerId: string,
  mediaId: string,
  text: string,
): Promise<void> => {
  const validated = validateCommentText(text);
  await assertEnabled(deps, ownerId);
  await withIgSession(deps, ownerId, ({ source }) => source.addComment(mediaId, validated));
};

export const removeComment = async (
  deps: SyncDeps,
  ownerId: string,
  mediaId: string,
  commentId: string,
): Promise<void> => {
  await assertEnabled(deps, ownerId);
  await withIgSession(deps, ownerId, ({ source }) => source.deleteComment(mediaId, commentId));
};
