"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { ModeDrawer } from "@/components/posta/mode-drawer";
import { ChoiceSheet } from "@/components/profilo/choice-sheet";
import { DmSendDrawer } from "@/components/profilo/dm-send-drawer";
import { ProfiloView } from "@/components/profilo/profilo-view";
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { authClient } from "@/lib/auth/client";
import { BUDGET_CHOICES, budgetLabel } from "@/lib/budget";
import { modeDefinition } from "@/lib/feed-modes";
import { isThemeChoice, THEMES, themeLabel } from "@/lib/profile";
import { useTRPC } from "@/trpc/client";

type Sheet = "feed" | "budget" | "theme" | "dm" | null;

const BUDGET_OPTIONS = [
  { value: 0, label: "Spento", description: "Nessun limite." },
  ...BUDGET_CHOICES.map((minutes) => ({ value: minutes, label: `${minutes} minuti` })),
];

export function ProfiloScreen() {
  const trpc = useTRPC();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { settings, setGrayscale, setBudget, setDmSend } = useFeedSettings();
  const { data: overview } = useSuspenseQuery(trpc.refresh.overview.queryOptions());
  const { data: session } = authClient.useSession();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setLoggingOut(false);
      toast.error("Non sono riuscito a uscire. Riprova.");
      return;
    }
    router.replace("/login");
  };

  return (
    <>
      <ProfiloView
        name={session?.user.name ?? "Il tuo profilo"}
        sessionStatus={overview.sessionStatus}
        modeLabel={modeDefinition(settings.feedMode).label}
        grayscale={settings.grayscaleMedia}
        dmSend={settings.dmSendEnabled}
        budgetLabel={budgetLabel(settings.sessionBudgetMinutes)}
        themeLabel={themeLabel(theme)}
        loggingOut={loggingOut}
        onGrayscale={(grayscaleMedia) => setGrayscale.mutate({ grayscaleMedia })}
        onDmSend={(dmSendEnabled) => {
          if (dmSendEnabled) setSheet("dm");
          else setDmSend.mutate({ dmSendEnabled });
        }}
        onOpenFeed={() => setSheet("feed")}
        onOpenBudget={() => setSheet("budget")}
        onOpenTheme={() => setSheet("theme")}
        onLogout={() => void logout()}
      />
      <ModeDrawer open={sheet === "feed"} onOpenChange={(open) => setSheet(open ? "feed" : null)} />
      <DmSendDrawer
        open={sheet === "dm"}
        onOpenChange={(open) => setSheet(open ? "dm" : null)}
        onConfirm={() => setDmSend.mutate({ dmSendEnabled: true })}
      />
      <ChoiceSheet
        open={sheet === "budget"}
        onOpenChange={(open) => setSheet(open ? "budget" : null)}
        title="Tempo di utilizzo"
        description="Dopo questo tempo in Posta, il feed si chiude per un'ora."
        name="session-budget"
        options={BUDGET_OPTIONS}
        value={settings.sessionBudgetMinutes ?? 0}
        onChange={(minutes) =>
          setBudget.mutate({ sessionBudgetMinutes: minutes === 0 ? null : minutes })
        }
      />
      <ChoiceSheet
        open={sheet === "theme"}
        onOpenChange={(open) => setSheet(open ? "theme" : null)}
        title="Tema"
        description="Scegli come appare l'app."
        name="theme"
        options={THEMES}
        value={isThemeChoice(theme) ? theme : "system"}
        onChange={setTheme}
      />
    </>
  );
}
