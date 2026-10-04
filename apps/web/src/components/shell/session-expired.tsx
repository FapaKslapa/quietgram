"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Postmark } from "@/components/brand/postmark";
import { Button } from "@/components/ui/button";
import { classifyRefreshError } from "@/lib/refresh-failure";
import { formatStampDay, formatStampYear } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

const STEPS = [
  "Apri instagram.com e controlla di essere collegato.",
  "Clicca l'estensione e premi Rinnova.",
  "Torna qui: la posta riprende da dove era.",
];

export function SessionExpired() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const now = Date.now();

  const recheck = useMutation(
    trpc.refresh.recheck.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    }),
  );
  const checking = recheck.isPending;
  const failure = recheck.isError ? classifyRefreshError(recheck.error) : null;

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-120 content-center justify-items-center gap-4 px-8 py-10 text-center">
      <Postmark
        top={formatStampDay(now)}
        bottom={formatStampYear(now)}
        topSize={11}
        className="size-30"
      />
      <h1 className="text-[1.6rem] leading-[1.1] font-bold tracking-[-0.03em]">
        La sessione con Instagram è scaduta
      </h1>
      <p className="max-w-[32ch] text-balance text-soft">
        Riapri l&apos;estensione dal browser dove sei collegato per rinnovarla.
      </p>
      <ol className="grid w-full max-w-75 gap-2.5 text-left [counter-reset:step]">
        {STEPS.map((step) => (
          <li
            key={step}
            className="flex items-baseline gap-3 text-[0.9375rem] before:num before:font-medium before:text-accent before:content-[counter(step)] before:[counter-increment:step]"
          >
            {step}
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        onClick={() => recheck.mutate()}
        disabled={checking}
        aria-busy={checking}
        className="mt-2 h-11 rounded-full bg-sheet px-5 text-[0.9375rem] font-semibold"
      >
        {checking ? "Controllo in corso" : "Ho rinnovato la sessione"}
      </Button>
      {failure ? (
        <p role="alert" className="max-w-[36ch] text-balance text-[0.9375rem] text-soft">
          {failure.kind === "throttled"
            ? "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'."
            : failure.kind === "expired"
              ? "La sessione risulta ancora scaduta. "
              : "Non sono riuscito a controllare la sessione. Riprova tra poco."}
          {failure.kind === "expired" ? (
            <>
              Genera un nuovo codice di abbinamento su{" "}
              <Link href="/pair" className="font-semibold text-accent underline">
                /pair
              </Link>{" "}
              e premi Rinnova nell&apos;estensione.
            </>
          ) : null}
        </p>
      ) : null}
    </main>
  );
}
