export type AuthFailure = { code?: string | undefined; status?: number | undefined };

export type AuthAction = "login" | "register";

const CANCELLED_CODES = new Set([
  "AUTH_CANCELLED",
  "ERROR_CEREMONY_ABORTED",
  "ERROR_PASSKEY_CANCELLED",
]);
const DENIED_CODES = new Set(["BOOTSTRAP_DENIED", "EMAIL_NOT_ALLOWED"]);

export const describeAuthError = (failure: AuthFailure | null, action: AuthAction): string => {
  const code = failure?.code ?? "";
  if (CANCELLED_CODES.has(code)) return "Operazione annullata. Riprova quando vuoi.";
  if (action === "register") {
    if (DENIED_CODES.has(code) || failure?.status === 403) {
      return "Email o codice di registrazione non validi, oppure questo account ha già una passkey.";
    }
    if (failure?.status === 429) return "Troppi tentativi. Aspetta un momento e riprova.";
    return "Non sono riuscito a creare la passkey. Riprova.";
  }
  if (failure?.status === 401 || failure?.status === 404 || code.includes("NOT_FOUND")) {
    return "Nessuna passkey trovata su questo dispositivo. Se è il tuo primo accesso, usa Primo accesso.";
  }
  if (failure?.status === 429) return "Troppi tentativi. Aspetta un momento e riprova.";
  return "Accesso non riuscito. Riprova.";
};

export const canRegister = (email: string, secret: string): boolean =>
  /^\S+@\S+\.\S+$/.test(email.trim()) && secret.trim().length > 0;
