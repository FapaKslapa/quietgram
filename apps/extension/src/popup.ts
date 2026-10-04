import { readInstagramCookies } from "#ext/cookies";
import { type PairResult, pair } from "#ext/pair";
import { readState, writeState } from "#ext/state";

const MESSAGES = {
  ok: "Collegato",
  invalid_token: "Token non valido o scaduto",
  rejected: "Richiesta rifiutata dal server",
  network: "Server non raggiungibile",
} as const satisfies Record<"ok" | Extract<PairResult, { ok: false }>["reason"], string>;

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element ${id}`);
  return found as T;
};

const tokenInput = element<HTMLInputElement>("token");
const button = element<HTMLButtonElement>("pair");
const status = element<HTMLParagraphElement>("status");

const render = async () => {
  const { pairedAt, renewNeeded } = await readState();
  button.textContent = pairedAt === null ? "Collega" : "Rinnova";
  if (renewNeeded) status.textContent = "La sessione Instagram e cambiata: rinnova il collegamento";
};

button.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (token === "") {
    status.textContent = "Inserisci il token";
    return;
  }
  button.disabled = true;
  const cookies = await readInstagramCookies(chrome.cookies);
  if (cookies === null) {
    status.textContent = "Accedi a Instagram nel browser e riprova";
    button.disabled = false;
    return;
  }
  const result = await pair(fetch, __APP_ORIGIN__, token, cookies);
  status.textContent = MESSAGES[result.ok ? "ok" : result.reason];
  if (result.ok) {
    await writeState({ pairedAt: Date.now(), renewNeeded: false });
    await chrome.action.setBadgeText({ text: "" });
    tokenInput.value = "";
  }
  button.disabled = false;
  await render();
});

void render();
