import { normalizeCode } from "#ext/code";
import { readInstagramCookies } from "#ext/cookies";
import { pairedLabel } from "#ext/date-label";
import { errorMessage, type PairFailure } from "#ext/messages";
import { pair } from "#ext/pair";
import { checkSession } from "#ext/session-check";
import { readState, writeState } from "#ext/state";
import {
  connectCopy,
  pairedCopy,
  type SessionView,
  selectView,
  sessionLabel,
  type View,
} from "#ext/view";

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
const openInstagram = find("open-instagram", HTMLAnchorElement);
const pairedTitle = find("paired-title", HTMLElement);
const pairedDate = find("paired-date", HTMLElement);
const retry = find("retry", HTMLButtonElement);
const pairedSession = find("paired-session", HTMLElement);
const pairedOrigin = find("paired-origin", HTMLElement);
const unpair = find("unpair", HTMLButtonElement);

const verify = async (): Promise<SessionView> => {
  if ((await readInstagramCookies(chrome.cookies)) === null) return "none";
  return checkSession(fetch);
};

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

const renderConnect = (view: Exclude<View, "paired">, session: SessionView) => {
  const copy = connectCopy(view, session);
  connectTitle.textContent = copy.title;
  connectHelp.textContent = copy.help;
  submit.textContent = copy.action;
  connectSession.dataset.session = session;
  connectSessionText.textContent = sessionLabel(session);
  openInstagram.hidden = session !== "invalid";
};

const renderPaired = (pairedAt: number, session: SessionView) => {
  const copy = pairedCopy(session, pairedLabel(pairedAt));
  pairedTitle.textContent = copy.title;
  pairedDate.textContent = copy.help;
  pairedSession.textContent = copy.value;
  pairedOrigin.textContent = new URL(__APP_ORIGIN__).host;
  paired.dataset.session = session;
  retry.hidden = session !== "unknown";
};

const present = async (session: SessionView) => {
  const state = await readState();
  const view = selectView(state);
  root.dataset.view = view;
  if (view === "paired" && state.pairedAt !== null) renderPaired(state.pairedAt, session);
  else if (view !== "paired") renderConnect(view, session);
  connect.hidden = view === "paired";
  paired.hidden = view !== "paired";
};

const flagRenewal = async () => {
  await writeState({ renewNeeded: true });
  await chrome.action.setBadgeText({ text: "!" });
};

const refresh = async () => {
  setBusy(true);
  await present("checking");
  const session = await verify();
  if (session === "invalid" && (await readState()).pairedAt !== null) await flagRenewal();
  setBusy(false);
  await present(session);
};

type Attempt = { failure: PairFailure | null; session: SessionView };

const attempt = async (code: string): Promise<Attempt> => {
  if (code === "") return { failure: "empty", session: "none" };
  const cookies = await readInstagramCookies(chrome.cookies);
  if (cookies === null) return { failure: "no_session", session: "none" };
  const session = await checkSession(fetch);
  if (session === "invalid") return { failure: null, session };
  if (session === "unknown") return { failure: "session_unknown", session };
  const result = await pair(fetch, __APP_ORIGIN__, code, cookies);
  return { failure: result.ok ? null : result.reason, session };
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
  const { failure, session } = await attempt(normalizeCode(codeInput.value));
  setBusy(false);
  if (session === "invalid") {
    await flagRenewal();
    await present(session);
    return;
  }
  if (failure !== null) {
    showError(failure);
    await present(session);
    return;
  }
  await writeState({ pairedAt: Date.now(), renewNeeded: false });
  await chrome.action.setBadgeText({ text: "" });
  codeInput.value = "";
  await present(session);
});

retry.addEventListener("click", () => {
  void refresh();
});

unpair.addEventListener("click", async () => {
  await writeState({ pairedAt: null, renewNeeded: false });
  await chrome.action.setBadgeText({ text: "" });
  await refresh();
});

void refresh();
