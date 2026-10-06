export const formatRemaining = (seconds: number): string => {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
};

export const cooldownMessage = (seconds: number): string =>
  `Hai già aggiornato. Riprova tra ${formatRemaining(seconds)}.`;

export const THROTTLE_TOAST =
  "Instagram ti chiede di aspettare qualche minuto. Riprova tra un po'.";
