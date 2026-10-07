export type PostFlags = { liked: boolean; saved: boolean };

export type FlagAction = "like" | "unlike" | "save" | "unsave";

export type FlagOverride = { base: PostFlags; value: PostFlags };

export const INTERACTIONS_OFF_HINT = "Interazioni disattivate: attivale in Profilo";

export const INTERACTIONS_WARNING =
  "Instagram può limitare l'account se rifiuta mi piace, commenti o salvataggi. Attiva solo se vuoi usarli da qui.";

export const applyAction = (flags: PostFlags, action: FlagAction): PostFlags => {
  switch (action) {
    case "like":
      return { ...flags, liked: true };
    case "unlike":
      return { ...flags, liked: false };
    case "save":
      return { ...flags, saved: true };
    case "unsave":
      return { ...flags, saved: false };
  }
};

export const toggleAction = (flags: PostFlags, kind: "like" | "save"): FlagAction => {
  if (kind === "like") return flags.liked ? "unlike" : "like";
  return flags.saved ? "unsave" : "save";
};

export const resolveFlags = (server: PostFlags, override: FlagOverride | undefined): PostFlags =>
  override !== undefined &&
  override.base.liked === server.liked &&
  override.base.saved === server.saved
    ? override.value
    : server;

export const optimisticOverride = (
  server: PostFlags,
  current: FlagOverride | undefined,
  action: FlagAction,
): FlagOverride => ({
  base: server,
  value: applyAction(resolveFlags(server, current), action),
});

export const settleOverride = (
  server: PostFlags,
  current: FlagOverride | undefined,
  confirmed: PostFlags,
): FlagOverride | undefined =>
  current === undefined ? undefined : { base: server, value: confirmed };

export const adjustCount = (count: number | undefined, delta: 1 | -1): number | undefined =>
  count === undefined ? undefined : Math.max(0, count + delta);
