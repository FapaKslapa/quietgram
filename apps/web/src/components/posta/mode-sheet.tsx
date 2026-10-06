import { Check } from "lucide-react";
import { ExceptionsPanel } from "@/components/posta/exceptions-panel";
import { RecencyPanel } from "@/components/posta/recency-panel";
import { Reveal } from "@/components/posta/reveal";
import { ThresholdPanel } from "@/components/posta/threshold-panel";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { type FeedMode, MODES } from "@/lib/feed-modes";

export type ModeSettings = {
  feedMode: FeedMode;
  creatorThreshold: number;
  recencyDays: number;
  exceptions: { igUserId: string; username: string | null }[];
};

type ModeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ModeSettings;
  onMode: (mode: FeedMode) => void;
  onThreshold: (threshold: number) => void;
  onRecency: (days: number) => void;
  onAddException: (igUserId: string) => void;
  onRemoveException: (igUserId: string) => void;
};

export function ModeSheet({
  open,
  onOpenChange,
  settings,
  onMode,
  onThreshold,
  onRecency,
  onAddException,
  onRemoveException,
}: ModeSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <div className="column min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="pt-2 pb-4">
            <DrawerTitle>Cosa vuoi leggere?</DrawerTitle>
            <DrawerDescription className="mt-1">
              Scegli quali post vuoi vedere. Puoi cambiare quando vuoi.
            </DrawerDescription>
          </div>
          <fieldset className="grid divide-y border-y">
            <legend className="sr-only">Cosa vuoi leggere</legend>
            {MODES.map((definition) => (
              <label
                key={definition.mode}
                className="relative flex min-h-16 cursor-pointer items-center gap-3 py-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name="feed-mode"
                  value={definition.mode}
                  checked={settings.feedMode === definition.mode}
                  onChange={() => onMode(definition.mode)}
                  className="peer sr-only"
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <strong className="text-base font-semibold">{definition.label}</strong>
                  <span className="text-sm text-muted-foreground">{definition.description}</span>
                </span>
                <Check
                  aria-hidden="true"
                  strokeWidth={2.25}
                  className="size-5 flex-none opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                />
              </label>
            ))}
          </fieldset>
          <Reveal open={settings.feedMode === "friends"}>
            <ExceptionsPanel
              exceptions={settings.exceptions}
              onAdd={onAddException}
              onRemove={onRemoveException}
            />
          </Reveal>
          <Reveal open={settings.feedMode === "creators"}>
            <ThresholdPanel threshold={settings.creatorThreshold} onCommit={onThreshold} />
          </Reveal>
          <RecencyPanel days={settings.recencyDays} onCommit={onRecency} />
          <DrawerClose render={<Button size="lg" className="mt-6 w-full" />}>Fatto</DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
