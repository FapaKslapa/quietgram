import type { PairResult } from "#ext/pair";

export type PairFailure =
  | Extract<PairResult, { ok: false }>["reason"]
  | "no_session"
  | "empty"
  | "session_unknown";

export const ERROR_MESSAGES = {
  empty: "Incolla il codice di collegamento.",
  invalid_token: "Codice scaduto o già usato. Generane uno nuovo nell'app.",
  rejected: "Il server ha rifiutato la richiesta. Riprova tra poco.",
  network: "Server non raggiungibile. Controlla la connessione.",
  session_unknown: "Non riesco a verificare la sessione di Instagram. Riprova.",
  no_session: "Instagram non è aperto o non sei collegato. Accedi su instagram.com e riprova.",
} as const satisfies Record<PairFailure, string>;

export const errorMessage = (failure: PairFailure): string => ERROR_MESSAGES[failure];
