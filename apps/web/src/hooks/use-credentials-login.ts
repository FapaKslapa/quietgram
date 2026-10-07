"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { LoginSubmission } from "@/components/shell/credentials-login-drawer";
import { loginErrorMessage } from "@/lib/credentials/login-error";
import { useTRPC } from "@/trpc/client";

export function useCredentialsLogin() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const login = useMutation(
    trpc.credentials.login.mutationOptions({
      onSuccess: async () => {
        setOpen(false);
        toast.success("Accesso riuscito. Riprendo da dove eri.");
        await queryClient.invalidateQueries();
      },
    }),
  );

  return {
    open,
    pending: login.isPending,
    error: login.isError ? loginErrorMessage(login.error) : null,
    onOpenChange: (next: boolean) => {
      if (next) login.reset();
      setOpen(next);
    },
    onSubmit: ({ remember, username, password, totpSecret }: LoginSubmission) =>
      login.mutate({
        username,
        password,
        remember,
        ...(totpSecret.trim() ? { totpSecret: totpSecret.trim() } : {}),
      }),
  };
}
