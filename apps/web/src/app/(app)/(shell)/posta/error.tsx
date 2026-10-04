"use client";

import { Button } from "@/components/ui/button";

export default function PostaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="grid justify-items-center gap-3 px-8 pt-24 text-center">
      <h1 className="text-[1.6rem] leading-[1.1] font-bold tracking-[-0.03em]">
        Non riesco a caricare la posta
      </h1>
      <p className="max-w-[32ch] text-balance text-soft">
        Controlla la connessione e riprova tra un momento.
      </p>
      <Button
        type="button"
        onClick={reset}
        className="mt-2 h-11 rounded-full px-5 text-[0.9375rem] font-semibold"
      >
        Riprova
      </Button>
    </div>
  );
}
