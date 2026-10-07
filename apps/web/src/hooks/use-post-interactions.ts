"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  type FlagAction,
  type FlagOverride,
  type PostFlags,
  resolveFlags,
  toggleAction,
} from "@/lib/interactions";
import { flagCallbacks } from "@/lib/optimistic";
import { useTRPC } from "@/trpc/client";

const FAILURE = "Non sono riuscito a completare l'azione. Riprova.";

export function usePostInteractions(mediaId: string, server: PostFlags) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<FlagOverride | undefined>(undefined);
  const flags = resolveFlags(server, override);

  const handlers = (action: FlagAction) =>
    flagCallbacks(
      {
        server: () => server,
        override: () => override,
        update: setOverride,
        fail: () => toast.error(FAILURE),
        settle: async (settled) => {
          if (settled === "save" || settled === "unsave") {
            await queryClient.invalidateQueries({ queryKey: trpc.saved.list.queryKey() });
          }
        },
      },
      action,
    );

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
