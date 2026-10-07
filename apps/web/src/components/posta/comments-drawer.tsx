"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/posta/comments-sheet";
import { useNow } from "@/hooks/use-now";
import { authClient } from "@/lib/auth/client";
import {
  appendComment,
  type CommentRow,
  dropComment,
  mergeServerComments,
  pendingComment,
} from "@/lib/comments";
import { commentCallbacks } from "@/lib/optimistic";
import { useTRPC } from "@/trpc/client";

type CommentsDrawerProps = {
  mediaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  composerEnabled: boolean;
};

const NO_ROWS: CommentRow[] = [];

export function CommentsDrawer({
  mediaId,
  open,
  onOpenChange,
  composerEnabled,
}: CommentsDrawerProps) {
  const trpc = useTRPC();
  const now = useNow();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const counter = useRef(0);
  const [pending, setPending] = useState<CommentRow[]>(NO_ROWS);
  const listKey = trpc.comments.list.queryKey({ mediaId });
  const list = useQuery(trpc.comments.list.queryOptions({ mediaId }, { enabled: open }));

  const post = useMutation(
    trpc.interactions.comment.mutationOptions(
      commentCallbacks({
        add: (text) => {
          counter.current += 1;
          const row = pendingComment(
            { userId: "viewer", username: session?.user.name ?? "Tu", avatarUrl: null },
            text,
            Date.now(),
            String(counter.current),
          );
          setPending((current) => appendComment(current, row));
          return { id: row.id };
        },
        remove: (id) => setPending((current) => dropComment(current, id)),
        fail: () => toast.error("Non sono riuscito a pubblicare il commento. Riprova."),
        refresh: () => queryClient.invalidateQueries({ queryKey: listKey }),
      }),
    ),
  );

  const rows = useMemo(
    () => mergeServerComments(list.data ?? NO_ROWS, pending),
    [list.data, pending],
  );

  const state = list.isError && !list.data ? "error" : list.data ? "ready" : "loading";

  return (
    <CommentsSheet
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      rows={rows}
      now={now}
      composerEnabled={composerEnabled}
      onSubmit={(text) => post.mutate({ mediaId, text })}
      onRetry={() => void list.refetch()}
    />
  );
}
