"use client";

import { Button } from "@/components/ui/button";

type ScreenErrorProps = { title: string; reset: () => void };

export function ScreenError({ title, reset }: ScreenErrorProps) {
  return (
    <div role="alert" className="column grid justify-items-center gap-2 px-8 pt-24 text-center">
      <h1 className="text-xl font-bold tracking-[-0.025em]">{title}</h1>
      <p className="max-w-[32ch] text-sm text-balance text-muted-foreground">
        Controlla la connessione e riprova tra un momento.
      </p>
      <Button type="button" onClick={reset} className="mt-4">
        Riprova
      </Button>
    </div>
  );
}
