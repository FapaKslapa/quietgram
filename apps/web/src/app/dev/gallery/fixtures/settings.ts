import type { ModeSettings } from "@/components/posta/mode-sheet";

export const SETTINGS: ModeSettings = {
  feedMode: "friends",
  creatorThreshold: 50_000,
  recencyDays: 14,
  exceptions: [
    { igUserId: "11", username: "panificio.nino" },
    { igUserId: "12", username: "sara.m" },
  ],
};
