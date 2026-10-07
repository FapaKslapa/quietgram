export const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
export const TOTP_SECRET_PATTERN = /^[A-Za-z2-7\s=]{8,128}$/;
export const MAX_PASSWORD_LENGTH = 256;

export type CredentialForm = { username: string; password: string; totpSecret: string };

export type CredentialFormErrors = Partial<Record<keyof CredentialForm, string>>;

export const normalizeUsername = (value: string): string => value.trim().replace(/^@/, "");

export const validateCredentialForm = (form: CredentialForm): CredentialFormErrors => {
  const errors: CredentialFormErrors = {};
  if (!USERNAME_PATTERN.test(normalizeUsername(form.username))) {
    errors.username = "Inserisci il nome utente di Instagram, senza spazi.";
  }
  if (form.password.length === 0 || form.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = "Inserisci la password di Instagram.";
  }
  if (form.totpSecret.trim() !== "" && !TOTP_SECRET_PATTERN.test(form.totpSecret.trim())) {
    errors.totpSecret = "Il codice segreto non è valido: copialo dall'app di autenticazione.";
  }
  return errors;
};
