import type { SessionStatus } from "#ext/session-check";
import type { PairingState } from "#ext/state";

export type View = "unpaired" | "renew" | "paired";

export const selectView = ({ pairedAt, renewNeeded }: PairingState): View => {
  if (renewNeeded) return "renew";
  return pairedAt === null ? "unpaired" : "paired";
};

export type FormCopy = { title: string; help: string; action: string };

export const FORM_COPY = {
  unpaired: {
    title: "Collega Instagram",
    help: "Apri l'app, genera un codice di collegamento e incollalo qui.",
    action: "Collega",
  },
  renew: {
    title: "Rinnova il collegamento",
    help: "La sessione di Instagram è cambiata. Genera un nuovo codice nell'app e incollalo qui.",
    action: "Rinnova",
  },
} as const satisfies Record<Exclude<View, "paired">, FormCopy>;

export type SessionView = "none" | "checking" | SessionStatus;

export const SESSION_LABELS = {
  none: "Instagram non è aperto in questo browser",
  checking: "Verifico la sessione Instagram",
  valid: "Sessione Instagram valida",
  invalid: "Instagram ti ha scollegato",
  unknown: "Sessione non verificata",
} as const satisfies Record<SessionView, string>;

export const sessionLabel = (session: SessionView): string => SESSION_LABELS[session];

export const connectCopy = (view: Exclude<View, "paired">, session: SessionView): FormCopy => {
  const copy = FORM_COPY[view];
  if (session !== "invalid") return copy;
  return {
    title: "Instagram ti ha scollegato",
    help: `Esci e rientra su instagram.com, poi premi ${copy.action}.`,
    action: copy.action,
  };
};

export type PairedCopy = { title: string; help: string; value: string };

export const pairedCopy = (session: SessionView, date: string): PairedCopy => {
  if (session === "unknown") {
    return {
      title: "Sessione non verificata",
      help: "Non riesco a controllare Instagram in questo momento. Il collegamento resta attivo.",
      value: "Non verificata",
    };
  }
  if (session === "checking") {
    return { title: "Instagram collegato", help: date, value: "Verifica in corso" };
  }
  return {
    title: "Instagram collegato",
    help: date,
    value: session === "valid" ? "Valida" : "Non trovata",
  };
};
