import { isSessionChange } from "#ext/session-watch";
import { readState, writeState } from "#ext/state";

chrome.cookies.onChanged.addListener(async ({ cookie }) => {
  if (!isSessionChange(cookie)) return;
  const { pairedAt } = await readState();
  if (pairedAt === null) return;
  await writeState({ renewNeeded: true });
  await chrome.action.setBadgeText({ text: "!" });
});
