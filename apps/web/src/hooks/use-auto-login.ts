"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { CredentialForm } from "@/lib/credentials/form";
import { useTRPC } from "@/trpc/client";

export type AutoLoginStep = "confirm" | "form" | "remove" | null;

const SAVE_ERROR = "Non sono riuscito a salvare le credenziali. Controlla i dati e riprova.";

export function useAutoLogin() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const statusKey = trpc.credentials.status.queryKey();
  const status = useQuery(trpc.credentials.status.queryOptions());
  const [step, setStep] = useState<AutoLoginStep>(null);

  const publish = (next: NonNullable<typeof status.data>) => {
    queryClient.setQueryData(statusKey, next);
  };

  const save = useMutation(
    trpc.credentials.save.mutationOptions({
      onSuccess: (next) => {
        publish(next);
        setStep(null);
        toast.success("Accesso automatico attivo.");
      },
    }),
  );
  const remove = useMutation(
    trpc.credentials.remove.mutationOptions({
      onSuccess: (next) => {
        publish(next);
        toast.success("Credenziali cancellate.");
      },
      onError: () => toast.error("Non sono riuscito a cancellare le credenziali. Riprova."),
    }),
  );
  const resume = useMutation(
    trpc.credentials.resume.mutationOptions({
      onSuccess: publish,
      onError: () => toast.error("Non sono riuscito a riattivare l'accesso. Riprova."),
    }),
  );

  const state = status.data?.state ?? null;

  return {
    row: {
      loading: status.isPending,
      state,
      username: status.data?.username ?? null,
      resuming: resume.isPending,
      onToggle: (enabled: boolean) => {
        save.reset();
        setStep(enabled ? "confirm" : "remove");
      },
      onResume: () => resume.mutate(),
    },
    drawers: {
      step,
      username: status.data?.username ?? "",
      pending: save.isPending,
      error: save.isError ? SAVE_ERROR : null,
      onStep: setStep,
      onSave: (form: CredentialForm) =>
        save.mutate({
          username: form.username,
          password: form.password,
          ...(form.totpSecret.trim() ? { totpSecret: form.totpSecret.trim() } : {}),
        }),
      onRemove: () => remove.mutate(),
    },
  };
}
