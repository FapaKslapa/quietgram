export type PairingState = { pairedAt: number | null; renewNeeded: boolean };

export const readState = async (): Promise<PairingState> => {
  const stored = await chrome.storage.local.get({ pairedAt: null, renewNeeded: false });
  return {
    pairedAt: typeof stored.pairedAt === "number" ? stored.pairedAt : null,
    renewNeeded: stored.renewNeeded === true,
  };
};

export const writeState = (state: Partial<PairingState>): Promise<void> =>
  chrome.storage.local.set(state);
