"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";

type Settings = RouterOutputs["settings"]["get"];
type Snapshot = { previous: Settings | undefined };

export function useFeedSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const settingsKey = trpc.settings.get.queryKey();

  const { data: settings } = useSuspenseQuery(trpc.settings.get.queryOptions());

  const optimistic = <TVariables>(
    apply: (current: Settings, variables: TVariables) => Settings,
    failure: string,
  ) => ({
    onMutate: async (variables: TVariables): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: settingsKey });
      const previous = queryClient.getQueryData(settingsKey);
      queryClient.setQueryData(settingsKey, (current) =>
        current ? apply(current, variables) : current,
      );
      return { previous };
    },
    onError: (_error: unknown, _variables: TVariables, snapshot: Snapshot | undefined) => {
      if (snapshot?.previous) queryClient.setQueryData(settingsKey, snapshot.previous);
      toast.error(failure);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKey }),
        queryClient.invalidateQueries({ queryKey: trpc.feed.list.infiniteQueryKey() }),
      ]);
    },
  });

  const setMode = useMutation(
    trpc.settings.setFeedMode.mutationOptions(
      optimistic<{ feedMode: Settings["feedMode"] }>(
        (current, { feedMode }) => ({ ...current, feedMode }),
        "Non sono riuscito a cambiare cosa leggere. Riprova.",
      ),
    ),
  );

  const setThreshold = useMutation(
    trpc.settings.setThreshold.mutationOptions(
      optimistic<{ creatorThreshold: number }>(
        (current, { creatorThreshold }) => ({ ...current, creatorThreshold }),
        "Non sono riuscito a salvare la soglia. Riprova.",
      ),
    ),
  );

  const setRecencyDays = useMutation(
    trpc.settings.setRecencyDays.mutationOptions(
      optimistic<{ recencyDays: number }>(
        (current, { recencyDays }) => ({ ...current, recencyDays }),
        "Non sono riuscito a salvare i giorni. Riprova.",
      ),
    ),
  );

  const addException = useMutation(
    trpc.settings.addException.mutationOptions(
      optimistic<{ igUserId: string; username?: string }>(
        (current, { igUserId, username }) =>
          current.exceptions.some((entry) => entry.igUserId === igUserId)
            ? current
            : {
                ...current,
                exceptions: [...current.exceptions, { igUserId, username: username ?? null }],
              },
        "Non sono riuscito ad aggiungere l'eccezione. Riprova.",
      ),
    ),
  );

  const removeException = useMutation(
    trpc.settings.removeException.mutationOptions(
      optimistic<{ igUserId: string }>(
        (current, { igUserId }) => ({
          ...current,
          exceptions: current.exceptions.filter((entry) => entry.igUserId !== igUserId),
        }),
        "Non sono riuscito a rimuovere l'eccezione. Riprova.",
      ),
    ),
  );

  return { settings, setMode, setThreshold, setRecencyDays, addException, removeException };
}
