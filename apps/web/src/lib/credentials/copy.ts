export const AUTO_LOGIN_SUMMARY =
  "Quando la sessione con Instagram scade, l'app accede da sola senza chiederti l'estensione.";

export const AUTO_LOGIN_POINTS = [
  "La password viene salvata cifrata e non ti viene più mostrata. Puoi cancellarla quando vuoi.",
  "Instagram può comunque chiedere una verifica di sicurezza: in quel caso la confermi tu su instagram.com.",
  "Gli accessi automatici possono insospettire Instagram e mettere a rischio l'account. L'app prova al massimo una volta ogni 30 minuti e tre volte al giorno.",
] as const;

export const AUTO_LOGIN_CHALLENGE =
  "Instagram chiede una verifica: aprila su instagram.com e conferma, poi riprova.";

export const AUTO_LOGIN_REJECTED =
  "Instagram non accetta la password salvata: aggiornala per riattivare l'accesso.";

export type AutoLoginState = "ready" | "challenge" | "rejected";

export const autoLoginDescription = (
  state: AutoLoginState | null,
  username: string | null,
): string => {
  if (state === "challenge") return AUTO_LOGIN_CHALLENGE;
  if (state === "rejected") return AUTO_LOGIN_REJECTED;
  if (state === "ready") return `Attivo per @${username ?? ""}.`;
  return "Rientra su Instagram da solo quando la sessione scade.";
};
