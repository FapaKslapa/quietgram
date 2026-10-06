import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Apri instagram.com e controlla di essere collegato.",
  "Clicca l'estensione e premi Rinnova.",
  "Torna qui: tutto riprende da dove era.",
];

type Failure = "throttled" | "expired" | "other";

type SessionExpiredViewProps = {
  checking: boolean;
  failure: Failure | null;
  onRecheck: () => void;
};

export function SessionExpiredView({ checking, failure, onRecheck }: SessionExpiredViewProps) {
  return (
    <main className="column grid min-h-dvh content-center gap-5 px-8 py-10">
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.025em]">
          La sessione con Instagram è scaduta
        </h1>
        <p className="max-w-[34ch] text-balance text-muted-foreground">
          Riapri l&apos;estensione dal browser dove sei collegato per rinnovarla.
        </p>
      </div>
      <ol className="grid gap-3 [counter-reset:step]">
        {STEPS.map((step) => (
          <li
            key={step}
            className="flex items-baseline gap-3 text-[0.9375rem] before:w-3 before:flex-none before:font-semibold before:text-muted-foreground before:content-[counter(step)] before:[counter-increment:step] before:num-display"
          >
            {step}
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        onClick={onRecheck}
        disabled={checking}
        aria-busy={checking}
        className="justify-self-start"
      >
        {checking ? "Controllo in corso" : "Ho rinnovato la sessione"}
      </Button>
      {failure ? (
        <p role="alert" className="max-w-[40ch] text-sm text-balance text-destructive">
          {failure === "throttled"
            ? "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'."
            : failure === "expired"
              ? "La sessione risulta ancora scaduta. "
              : "Non sono riuscito a controllare la sessione. Riprova tra poco."}
          {failure === "expired" ? (
            <>
              Genera un nuovo codice di abbinamento su{" "}
              <Link href="/pair" className="font-semibold underline underline-offset-4">
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
