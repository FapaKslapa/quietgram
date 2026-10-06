"use client";

import { ModeSheet } from "@/components/posta/mode-sheet";
import { useFeedSettings } from "@/hooks/use-feed-settings";

type ModeDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModeDrawer({ open, onOpenChange }: ModeDrawerProps) {
  const { settings, setMode, setThreshold, setRecencyDays, addException, removeException } =
    useFeedSettings();

  return (
    <ModeSheet
      open={open}
      onOpenChange={onOpenChange}
      settings={settings}
      onMode={(feedMode) => setMode.mutate({ feedMode })}
      onThreshold={(creatorThreshold) => setThreshold.mutate({ creatorThreshold })}
      onRecency={(recencyDays) => setRecencyDays.mutate({ recencyDays })}
      onAddException={(igUserId) => addException.mutate({ igUserId })}
      onRemoveException={(igUserId) => removeException.mutate({ igUserId })}
    />
  );
}
