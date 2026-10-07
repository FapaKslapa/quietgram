import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AUTO_LOGIN_CHALLENGE, AUTO_LOGIN_REJECTED } from "@/lib/credentials/copy";

const STEPS = [
  "Apri instagram.com e controlla di essere collegato.",
  "Clicca l'estensione e premi Rinnova.",
  "Torna qui: tutto riprende da dove era.",
];

type Failure = "throttled" | "expired" | "other";

export type SessionAttention = "challenge" | "rejected";

type SessionExpiredViewProps = {
  attention?: SessionAttention | null;
  checking: boolean;
  failure: Failure | null;
  onRecheck: () => void;
  onLogin: () => void;
  children?: ReactNode;
};

function AttentionNote({ attention }: { attention: SessionAttention | null }) {
  if (attention === null) return null;
  return (
    <p
      role="status"
      className="max-w-[38ch] border-l-2 border-foreground pl-3 text-[0.9375rem] text-pretty"
    >
      {attention === "challenge" ? AUTO_LOGIN_CHALLENGE : AUTO_LOGIN_REJECTED}
      {attention === "rejected" ? (
        <>
          {" "}
          <Link href="/profilo" className="font-semibold underline underline-offset-4">
            Apri Profilo
          </Link>
        </>
      ) : null}
    </p>
  );
}

function FailureNote({ failure }: { failure: Failure | null }) {
  if (failure === null) return null;
  return (
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
  );
}

const recheckLabel = (checking: boolean, attention: SessionAttention | null): string => {
  if (checking) return "Controllo in corso";
  return attention === "challenge" ? "Ho confermato, riprova" : "Ho rinnovato la sessione";
};

export function SessionExpiredView({
  attention = null,
  checking,
  failure,
  onRecheck,
  onLogin,
  children,
}: SessionExpiredViewProps) {
  return (
    <main className="column grid min-h-dvh content-center gap-5 px-8 py-10">
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.025em]">
          La sessione con Instagram è scaduta
        </h1>
        <p className="max-w-[34ch] text-balance text-muted-foreground">
          Accedi di nuovo con le credenziali oppure rinnovala con l&apos;estensione.
        </p>
      </div>
      <AttentionNote attention={attention} />
      <Button type="button" size="lg" onClick={onLogin} className="justify-self-start">
        Accedi con le credenziali
      </Button>
      <p className="text-sm text-muted-foreground">Oppure con l&apos;estensione:</p>
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
        {recheckLabel(checking, attention)}
      </Button>
      <FailureNote failure={failure} />
      {children}
    </main>
  );
}
