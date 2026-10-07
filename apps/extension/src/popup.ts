import { normalizeCode } from "#ext/code";
import { readInstagramCookies } from "#ext/cookies";
import { pairedLabel } from "#ext/date-label";
import { errorMessage, type PairFailure } from "#ext/messages";
import { pair } from "#ext/pair";
import { checkSession, type SessionReason } from "#ext/session-check";
import { readState, writeState } from "#ext/state";
import {
  connectCopy,
  pairedCopy,
  type SessionView,
  selectView,
  sessionDiagnostic,
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
const connectDiagnostic = find("connect-diagnostic", HTMLElement);
const pairedDiagnostic = find("paired-diagnostic", HTMLElement);
const pairedSession = find("paired-session", HTMLElement);
const pairedOrigin = find("paired-origin", HTMLElement);
const unpair = find("unpair", HTMLButtonElement);

type Observed = { session: SessionView; reason: SessionReason | null };

const verify = async (): Promise<Observed> => {
  if ((await readInstagramCookies(chrome.cookies)) === null) {
    return { session: "none", reason: null };
  }
  const { status, reason } = await checkSession(fetch);
  return { session: status, reason };
};

const showDiagnostic = (target: HTMLElement, reason: SessionReason | null) => {
  const text = sessionDiagnostic(reason);
  target.hidden = text === null;
  target.textContent = text ?? "";
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

const renderConnect = (
  view: Exclude<View, "paired">,
  session: SessionView,
  reason: SessionReason | null,
) => {
  const copy = connectCopy(view, session);
  connectTitle.textContent = copy.title;
  connectHelp.textContent = copy.help;
  submit.textContent = copy.action;
  connectSession.dataset.session = session;
  connectSessionText.textContent = sessionLabel(session);
  openInstagram.hidden = session !== "invalid";
  showDiagnostic(connectDiagnostic, reason);
};

const renderPaired = (pairedAt: number, session: SessionView, reason: SessionReason | null) => {
  const copy = pairedCopy(session, pairedLabel(pairedAt));
  pairedTitle.textContent = copy.title;
  pairedDate.textContent = copy.help;
  pairedSession.textContent = copy.value;
  pairedOrigin.textContent = new URL(__APP_ORIGIN__).host;
  paired.dataset.session = session;
  retry.hidden = session !== "unknown";
  showDiagnostic(pairedDiagnostic, reason);
};

const present = async (session: SessionView, reason: SessionReason | null = null) => {
  const state = await readState();
  const view = selectView(state);
  root.dataset.view = view;
  if (view === "paired" && state.pairedAt !== null) renderPaired(state.pairedAt, session, reason);
  else if (view !== "paired") renderConnect(view, session, reason);
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
  const { session, reason } = await verify();
  if (session === "invalid" && (await readState()).pairedAt !== null) await flagRenewal();
  setBusy(false);
  await present(session, reason);
};

type Attempt = Observed & { failure: PairFailure | null };

const attempt = async (code: string): Promise<Attempt> => {
  if (code === "") return { failure: "empty", session: "none", reason: null };
  const cookies = await readInstagramCookies(chrome.cookies);
  if (cookies === null) return { failure: "no_session", session: "none", reason: null };
  const { status: session, reason } = await checkSession(fetch);
  if (session === "invalid") return { failure: null, session, reason };
  const result = await pair(fetch, __APP_ORIGIN__, code, cookies);
  return { failure: result.ok ? null : result.reason, session, reason };
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
  const { failure, session, reason } = await attempt(normalizeCode(codeInput.value));
  setBusy(false);
  if (session === "invalid") {
    await flagRenewal();
    await present(session, reason);
    return;
  }
  if (failure !== null) {
    showError(failure);
    await present(session, reason);
    return;
  }
  await writeState({ pairedAt: Date.now(), renewNeeded: false });
  await chrome.action.setBadgeText({ text: "" });
  codeInput.value = "";
  await present(session, reason);
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
