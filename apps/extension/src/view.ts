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

export const sessionLabel = (sessionFound: boolean): string =>
  sessionFound ? "Sessione Instagram trovata" : "Instagram non è aperto in questo browser";
