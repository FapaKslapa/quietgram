import type { IgComment } from "@nodistraction/ig";
import type { SyncDeps } from "@/lib/sync/deps";
import { withIgSession } from "@/lib/sync/session";

export const listComments = (
  deps: SyncDeps,
  ownerId: string,
  mediaId: string,
): Promise<IgComment[]> => withIgSession(deps, ownerId, ({ source }) => source.comments(mediaId));
