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
  "Premi Collega: la sessione viene salvata cifrata e sei pronto.",
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
    <main className="flex min-h-dvh flex-col pb-10">
      <header className="relative isolate">
        <Weave variant="wave" surface="head" active />
        <div className="column px-5 pt-5 pb-8">
          <Link
            href="/posta"
            className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-5" strokeWidth={1.8} aria-hidden="true" />
            Posta
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.025em]">Collega Instagram</h1>
          <p className="mt-2 max-w-[34ch] text-balance text-muted-foreground">
            Genera un codice e incollalo nell&apos;estensione. Vale una sola volta.
          </p>
        </div>
      </header>
      <section className="column grid gap-4 px-5 pt-4">
        {token && !expired ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Il tuo codice</p>
            <output
              aria-label="Codice di collegamento"
              className="num-display block rounded-md border bg-card px-4 py-4 text-xl leading-snug font-semibold break-all select-all"
            >
              {token}
            </output>
            <div className="flex items-center justify-between gap-3">
              <p role="timer" className="num-display text-sm text-muted-foreground">
                Scade tra{" "}
                <span className="font-semibold text-foreground">{formatCountdown(remaining)}</span>
              </p>
              <Button type="button" onClick={() => void copy()}>
                {copied ? (
                  <Check className="size-4" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Copy className="size-4" strokeWidth={2} aria-hidden="true" />
                )}
                {copied ? "Copiato" : "Copia"}
              </Button>
            </div>
          </div>
        ) : null}
        {expired ? (
          <p role="status" className="text-sm text-balance text-muted-foreground">
            Il codice è scaduto. Generane uno nuovo.
          </p>
        ) : null}
        <Button
          type="button"
          size={token && !expired ? "default" : "lg"}
          variant={token && !expired ? "outline" : "default"}
          onClick={() => issue.mutate()}
          disabled={issue.isPending}
          aria-busy={issue.isPending}
          className="w-full"
        >
          {token ? "Genera un nuovo codice" : "Genera codice"}
        </Button>
        {issue.isError ? (
          <p role="alert" className="text-sm text-balance text-destructive">
            Non sono riuscito a generare il codice. Riprova tra un momento.
          </p>
        ) : null}
      </section>
      <ol className="column mt-10 grid gap-3 px-5 [counter-reset:step]">
        {STEPS.map((step) => (
          <li
            key={step}
            className="flex items-baseline gap-3 text-[0.9375rem] before:w-3 before:flex-none before:font-semibold before:text-muted-foreground before:content-[counter(step)] before:[counter-increment:step] before:num-display"
          >
            {step}
          </li>
        ))}
      </ol>
    </main>
  );
}
