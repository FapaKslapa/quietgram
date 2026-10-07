"use client";

import { useState } from "react";
import { noop } from "@/app/dev/gallery/frames/helpers";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { AutoLoginDrawers } from "@/components/profilo/auto-login-drawers";
import { ChoiceSheet } from "@/components/profilo/choice-sheet";
import { DmSendDrawer } from "@/components/profilo/dm-send-drawer";
import { InteractionsDrawer } from "@/components/profilo/interactions-drawer";
import { ProfiloView } from "@/components/profilo/profilo-view";
import { TabBarView } from "@/components/shell/tab-bar-view";
import type { AutoLoginStep } from "@/hooks/use-auto-login";
import { BUDGET_CHOICES } from "@/lib/budget";
import type { AutoLoginState } from "@/lib/credentials/copy";
import { modeDefinition } from "@/lib/feed-modes";
import { THEMES } from "@/lib/profile";

type Sheet = "budget" | "theme" | "dm" | "interactions";
type ThemeValue = "system" | "light" | "dark";

const BUDGET_OPTIONS = [
  { value: 0, label: "Spento", description: "Nessun limite." },
  ...BUDGET_CHOICES.map((minutes) => ({ value: minutes, label: `${minutes} minuti` })),
];

type FrameOptions = {
  sheet?: Sheet | null;
  autoLogin?: AutoLoginState | null;
  step?: AutoLoginStep;
};

function ProfiloFrame({ sheet = null, autoLogin = null, step = null }: FrameOptions) {
  const [autoState, setAutoState] = useState<AutoLoginState | null>(autoLogin);
  const [autoStep, setAutoStep] = useState<AutoLoginStep>(step);
  const [grayscale, setGrayscale] = useState(false);
  const [dmSend, setDmSend] = useState(false);
  const [interactions, setInteractions] = useState(false);
  const [open, setOpen] = useState<Sheet | null>(sheet);
  const [budget, setBudget] = useState(15);
  const [theme, setTheme] = useState<ThemeValue>("system");

  const bindSheet = (name: Sheet) => ({
    open: open === name,
    onOpenChange: (next: boolean) => setOpen(next ? name : null),
  });

  return (
    <>
      <ProfiloView
        name="Stefano Marocco"
        sessionStatus="active"
        modeLabel={modeDefinition("friends").label}
        grayscale={grayscale}
        budgetLabel={budget === 0 ? "Spento" : `${budget} minuti`}
        themeLabel={THEMES.find((entry) => entry.value === theme)?.label ?? "Sistema"}
        loggingOut={false}
        autoLogin={{
          loading: false,
          state: autoState,
          username: autoState === null ? null : "stefano.marocco",
          resuming: false,
          onToggle: (enabled) => setAutoStep(enabled ? "confirm" : "remove"),
          onResume: () => setAutoState("ready"),
        }}
        dmSend={dmSend}
        interactions={interactions}
        onInteractions={(next) => (next ? setOpen("interactions") : setInteractions(false))}
        onGrayscale={setGrayscale}
        onDmSend={(next) => (next ? setOpen("dm") : setDmSend(false))}
        onOpenFeed={noop}
        onOpenBudget={() => setOpen("budget")}
        onOpenTheme={() => setOpen("theme")}
        onLogout={noop}
      />
      <TabBarView pathname="/profilo" unread={false} />
      <AutoLoginDrawers
        step={autoStep}
        username="stefano.marocco"
        pending={false}
        error={null}
        onStep={setAutoStep}
        onSave={() => {
          setAutoState("ready");
          setAutoStep(null);
        }}
        onRemove={() => setAutoState(null)}
      />
      <DmSendDrawer {...bindSheet("dm")} onConfirm={() => setDmSend(true)} />
      <InteractionsDrawer {...bindSheet("interactions")} onConfirm={() => setInteractions(true)} />
      <ChoiceSheet
        {...bindSheet("budget")}
        title="Tempo di utilizzo"
        description="Dopo questo tempo in Posta, il feed si chiude per un'ora."
        name="session-budget"
        options={BUDGET_OPTIONS}
        value={budget}
        onChange={setBudget}
      />
      <ChoiceSheet
        {...bindSheet("theme")}
        title="Tema"
        description="Scegli come appare l'app."
        name="theme"
        options={THEMES}
        value={theme}
        onChange={setTheme}
      />
    </>
  );
}

export const PROFILO_VIEWS = {
  profilo: () => <ProfiloFrame />,
  "profilo-budget": () => <ProfiloFrame sheet="budget" />,
  "profilo-theme": () => <ProfiloFrame sheet="theme" />,
  "profilo-dm-confirm": () => <ProfiloFrame sheet="dm" />,
  "profilo-interactions-confirm": () => <ProfiloFrame sheet="interactions" />,
  "profilo-autologin-active": () => <ProfiloFrame autoLogin="ready" />,
  "profilo-autologin-challenge": () => <ProfiloFrame autoLogin="challenge" />,
  "profilo-autologin-rejected": () => <ProfiloFrame autoLogin="rejected" />,
  "profilo-autologin-confirm": () => <ProfiloFrame step="confirm" />,
  "profilo-autologin-form": () => <ProfiloFrame step="form" />,
  "profilo-autologin-remove": () => <ProfiloFrame autoLogin="ready" step="remove" />,
} satisfies ViewMap;
