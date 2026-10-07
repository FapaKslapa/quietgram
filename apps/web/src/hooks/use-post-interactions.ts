"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  type FlagAction,
  type FlagOverride,
  optimisticOverride,
  type PostFlags,
  resolveFlags,
  settleOverride,
  toggleAction,
} from "@/lib/interactions";
import { useTRPC } from "@/trpc/client";

const FAILURE = "Non sono riuscito a completare l'azione. Riprova.";

type Snapshot = { previous: FlagOverride | undefined };

export function usePostInteractions(mediaId: string, server: PostFlags) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<FlagOverride | undefined>(undefined);
  const flags = resolveFlags(server, override);

  const handlers = (action: FlagAction) => ({
    onMutate: (): Snapshot => {
      const previous = override;
      setOverride(optimisticOverride(server, previous, action));
      return { previous };
    },
    onError: (_error: unknown, _variables: unknown, snapshot: Snapshot | undefined) => {
      setOverride(snapshot?.previous);
      toast.error(FAILURE);
    },
    onSuccess: (confirmed: PostFlags) => {
      setOverride((current) => settleOverride(server, current, confirmed));
    },
    onSettled: async () => {
      if (action === "save" || action === "unsave") {
        await queryClient.invalidateQueries({ queryKey: trpc.saved.list.queryKey() });
      }
    },
  });

  const like = useMutation(trpc.interactions.like.mutationOptions(handlers("like")));
  const unlike = useMutation(trpc.interactions.unlike.mutationOptions(handlers("unlike")));
  const save = useMutation(trpc.interactions.save.mutationOptions(handlers("save")));
  const unsave = useMutation(trpc.interactions.unsave.mutationOptions(handlers("unsave")));

  const mutations = { like, unlike, save, unsave };

  const toggle = (kind: "like" | "save") => {
    mutations[toggleAction(flags, kind)].mutate({ mediaId });
  };

  const likeOnce = () => {
    if (!flags.liked) like.mutate({ mediaId });
  };

  return { flags, toggle, likeOnce };
}
