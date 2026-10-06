export const THEMES = [
  { value: "system", label: "Sistema", description: "Segue le impostazioni del telefono." },
  { value: "light", label: "Chiaro", description: "Carta chiara, inchiostro scuro." },
  { value: "dark", label: "Scuro", description: "Nero profondo, testo chiaro." },
] as const;

export type ThemeChoice = (typeof THEMES)[number]["value"];

export const isThemeChoice = (value: string | undefined): value is ThemeChoice =>
  THEMES.some((theme) => theme.value === value);

export const themeLabel = (value: string | undefined): string =>
  THEMES.find((theme) => theme.value === value)?.label ?? "Sistema";

export type SessionStatus = "active" | "expired" | "none";

export const sessionLabel = (status: SessionStatus): string => {
  switch (status) {
    case "active":
      return "Attiva";
    case "expired":
      return "Scaduta";
    case "none":
      return "Non collegata";
  }
};

export const sessionAction = (status: SessionStatus): string =>
  status === "active" ? "Rinnova" : "Collega";
