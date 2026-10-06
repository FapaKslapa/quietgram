import { normalizeCode } from "#ext/code";
import { readInstagramCookies } from "#ext/cookies";
import { pairedLabel } from "#ext/date-label";
import { errorMessage, type PairFailure } from "#ext/messages";
import { pair } from "#ext/pair";
import { readState, writeState } from "#ext/state";
import { FORM_COPY, selectView, sessionLabel, type View } from "#ext/view";

const find = <T extends Element>(id: string, type: new () => T): T => {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Missing element ${id}`);
  return found;
};

const root = find("root", HTMLElement);
const connect = find("connect", HTMLElement);
const paired = find("paired", HTMLElement);
const connectTitle = find("connect-title", HTMLElement);
const connectHelp = find("connect-help", HTMLElement);
const connectSession = find("connect-session", HTMLElement);
const connectSessionText = find("connect-session-text", HTMLElement);
const form = find("form", HTMLFormElement);
const codeInput = find("code", HTMLInputElement);
const errorLine = find("error", HTMLElement);
const submit = find("submit", HTMLButtonElement);
const pairedDate = find("paired-date", HTMLElement);
const pairedSession = find("paired-session", HTMLElement);
const pairedOrigin = find("paired-origin", HTMLElement);
const unpair = find("unpair", HTMLButtonElement);

const hasInstagramSession = async (): Promise<boolean> =>
  (await readInstagramCookies(chrome.cookies)) !== null;

const showError = (failure: PairFailure | null) => {
  errorLine.hidden = failure === null;
  errorLine.textContent = failure === null ? "" : errorMessage(failure);
  codeInput.setAttribute("aria-invalid", String(failure !== null));
};

const setBusy = (busy: boolean) => {
  root.dataset.busy = String(busy);
  submit.disabled = busy;
  codeInput.readOnly = busy;
};

const renderConnect = (view: Exclude<View, "paired">, sessionFound: boolean) => {
  const copy = FORM_COPY[view];
  connectTitle.textContent = copy.title;
  connectHelp.textContent = copy.help;
  submit.textContent = copy.action;
  connectSession.dataset.session = String(sessionFound);
  connectSessionText.textContent = sessionLabel(sessionFound);
};

const renderPaired = (pairedAt: number, sessionFound: boolean) => {
  pairedDate.textContent = pairedLabel(pairedAt);
  pairedSession.textContent = sessionFound ? "Trovata" : "Non trovata";
  pairedOrigin.textContent = new URL(__APP_ORIGIN__).host;
};

const render = async () => {
  const [state, sessionFound] = await Promise.all([readState(), hasInstagramSession()]);
  const view = selectView(state);
  root.dataset.view = view;
  if (view === "paired" && state.pairedAt !== null) renderPaired(state.pairedAt, sessionFound);
  else if (view !== "paired") renderConnect(view, sessionFound);
  connect.hidden = view === "paired";
  paired.hidden = view !== "paired";
};

const failureOf = async (code: string): Promise<PairFailure | null> => {
  if (code === "") return "empty";
  const cookies = await readInstagramCookies(chrome.cookies);
  if (cookies === null) return "no_session";
  const result = await pair(fetch, __APP_ORIGIN__, code, cookies);
  return result.ok ? null : result.reason;
};

codeInput.addEventListener("input", () => {
  const cleaned = normalizeCode(codeInput.value);
  if (cleaned !== codeInput.value) codeInput.value = cleaned;
  showError(null);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  showError(null);
  setBusy(true);
  const failure = await failureOf(normalizeCode(codeInput.value));
  setBusy(false);
  if (failure !== null) {
    showError(failure);
    return;
  }
  await writeState({ pairedAt: Date.now(), renewNeeded: false });
  await chrome.action.setBadgeText({ text: "" });
  codeInput.value = "";
  await render();
});

unpair.addEventListener("click", async () => {
  await writeState({ pairedAt: null, renewNeeded: false });
  await chrome.action.setBadgeText({ text: "" });
  await render();
});

void render();
