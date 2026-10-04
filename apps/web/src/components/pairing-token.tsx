"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, ChevronLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Weave } from "@/components/brand/weave";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdown, TOKEN_LIFETIME_MS } from "@/lib/pairing-countdown";
import { useTRPC } from "@/trpc/client";

const STEPS = [
  "Installa l'estensione nodistraction nel browser dove sei collegato a instagram.com.",
  "Apri l'estensione e incolla il codice nel campo Token di collegamento.",
  "Premi Collega: la sessione viene salvata cifrata e la posta è pronta.",
];

export function PairingToken() {
  const trpc = useTRPC();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const issue = useMutation(
    trpc.pairing.issueToken.mutationOptions({
      onSuccess: () => {
        setExpiresAt(Date.now() + TOKEN_LIFETIME_MS);
        setCopied(false);
      },
    }),
  );
  const remaining = useCountdown(expiresAt);
  const token = issue.data?.token ?? null;
  const expired = token !== null && expiresAt !== null && remaining === 0;

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Codice copiato");
    } catch {
      toast.error("Non sono riuscito a copiare. Selezionalo e copialo a mano.");
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-120 flex-col pb-10">
      <header className="relative isolate px-5 pt-5 pb-6">
        <Weave variant="wave" surface="head" active />
        <Link
          href="/posta"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-[0.9375rem] font-medium text-soft transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-5" strokeWidth={1.6} aria-hidden="true" />
          Posta
        </Link>
        <h1 className="mt-2 text-[2rem] leading-[1.05] font-bold tracking-[-0.035em]">
          Collega Instagram
        </h1>
        <p className="mt-2 max-w-[34ch] text-balance text-soft">
          Genera un codice e incollalo nell&apos;estensione. Vale una sola volta.
        </p>
      </header>
      <section className="mx-3 grid gap-4 rounded-[28px] bg-sheet p-5 shadow-(--shadow-letter)">
        {token && !expired ? (
          <div className="grid gap-3">
            <p className="text-sm text-soft">Il tuo codice</p>
            <output
              aria-label="Codice di collegamento"
              className="num block rounded-2xl bg-muted px-4 py-4 text-[1.375rem] leading-snug font-semibold tracking-normal break-all select-all"
            >
              {token}
            </output>
            <div className="flex items-center justify-between gap-3">
              <p role="timer" className="num text-sm text-soft">
                Scade tra{" "}
                <span className="font-semibold text-ink">{formatCountdown(remaining)}</span>
              </p>
              <Button
                type="button"
                onClick={() => void copy()}
                className="h-11 rounded-full px-5 text-[0.9375rem] font-semibold shadow-(--shadow-lift)"
              >
                {copied ? (
                  <Check className="size-4" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Copy className="size-4" strokeWidth={1.8} aria-hidden="true" />
                )}
                {copied ? "Copiato" : "Copia"}
              </Button>
            </div>
          </div>
        ) : null}
        {expired ? (
          <p role="status" className="text-sm text-balance text-soft">
            Il codice è scaduto. Generane uno nuovo.
          </p>
        ) : null}
        <Button
          type="button"
          variant={token && !expired ? "outline" : "default"}
          onClick={() => issue.mutate()}
          disabled={issue.isPending}
          aria-busy={issue.isPending}
          className={
            token && !expired
              ? "h-11 w-full rounded-full bg-sheet text-[0.9375rem] font-semibold"
              : "h-[52px] w-full rounded-full text-base font-semibold shadow-(--shadow-lift)"
          }
        >
          {token ? "Genera un nuovo codice" : "Genera codice"}
        </Button>
        {issue.isError ? (
          <p role="alert" className="text-sm text-balance text-destructive">
            Non sono riuscito a generare il codice. Riprova tra un momento.
          </p>
        ) : null}
      </section>
      <ol className="mx-5 mt-8 grid gap-3 [counter-reset:step]">
        {STEPS.map((step) => (
          <li
            key={step}
            className="flex items-baseline gap-3 text-[0.9375rem] before:num before:w-3 before:flex-none before:font-medium before:text-accent before:content-[counter(step)] before:[counter-increment:step]"
          >
            {step}
          </li>
        ))}
      </ol>
    </main>
  );
}
