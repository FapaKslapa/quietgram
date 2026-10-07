"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/posta/comments-sheet";
import { authClient } from "@/lib/auth/client";
import { appendComment, type CommentRow, dropComment, pendingComment } from "@/lib/comments";
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
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const counter = useRef(0);
  const listKey = trpc.comments.list.queryKey({ mediaId });
  const list = useQuery(trpc.comments.list.queryOptions({ mediaId }, { enabled: open }));

  const post = useMutation(
    trpc.interactions.comment.mutationOptions({
      onMutate: async ({ text }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        counter.current += 1;
        const row = pendingComment(
          { userId: "viewer", username: session?.user.name ?? "Tu", avatarUrl: null },
          text,
          Date.now(),
          String(counter.current),
        );
        queryClient.setQueryData(listKey, (current) => appendComment(current ?? NO_ROWS, row));
        return { id: row.id };
      },
      onError: (_error, _variables, pending) => {
        if (pending) {
          queryClient.setQueryData(listKey, (current) =>
            current ? dropComment(current, pending.id) : current,
          );
        }
        toast.error("Non sono riuscito a pubblicare il commento. Riprova.");
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
    }),
  );

  const state = list.isError && !list.data ? "error" : list.data ? "ready" : "loading";

  return (
    <CommentsSheet
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      rows={list.data ?? NO_ROWS}
      now={Date.now()}
      composerEnabled={composerEnabled}
      onSubmit={(text) => post.mutate({ mediaId, text })}
      onRetry={() => void list.refetch()}
    />
  );
}
