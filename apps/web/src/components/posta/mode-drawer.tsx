"use client";

import { Weave } from "@/components/brand/weave";
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
import { useFeedSettings } from "@/hooks/use-feed-settings";
import { MODES } from "@/lib/feed-modes";

type ModeDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModeDrawer({ open, onOpenChange }: ModeDrawerProps) {
  const { settings, setMode, setThreshold, setRecencyDays, addException, removeException } =
    useFeedSettings();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-7">
          <div className="px-1 pt-2 pb-3.5">
            <DrawerTitle>Cosa vuoi leggere?</DrawerTitle>
            <DrawerDescription className="mt-1">
              Scegli da chi arriva la tua posta. Puoi cambiare quando vuoi.
            </DrawerDescription>
          </div>
          <fieldset className="grid gap-2.5">
            <legend className="sr-only">Cosa vuoi leggere</legend>
            {MODES.map((definition) => (
              <label
                key={definition.mode}
                className="relative isolate flex cursor-pointer items-center gap-3 overflow-hidden rounded-[22px] bg-sheet px-[18px] py-4 shadow-[0_0_0_1px_var(--line)] transition-shadow duration-300 hover:shadow-[0_0_0_1px_var(--soft)] has-checked:shadow-[0_0_0_2px_var(--accent)] has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent"
              >
                <Weave variant={definition.weave} surface="option" />
                <input
                  type="radio"
                  name="feed-mode"
                  value={definition.mode}
                  checked={settings.feedMode === definition.mode}
                  onChange={() => setMode.mutate({ feedMode: definition.mode })}
                  className="peer sr-only"
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <strong className="text-[1.0625rem] font-semibold">{definition.label}</strong>
                  <span className="text-sm text-soft">{definition.description}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="size-[22px] flex-none rounded-full shadow-[inset_0_0_0_1.5px_var(--line)] transition-[background-color,box-shadow] duration-300 peer-checked:bg-accent peer-checked:shadow-[inset_0_0_0_5px_var(--sheet),0_0_0_1.5px_var(--accent)]"
                />
              </label>
            ))}
          </fieldset>
          <Reveal open={settings.feedMode === "friends"}>
            <ExceptionsPanel
              exceptions={settings.exceptions}
              onAdd={(igUserId) => addException.mutate({ igUserId })}
              onRemove={(igUserId) => removeException.mutate({ igUserId })}
            />
          </Reveal>
          <Reveal open={settings.feedMode === "creators"}>
            <ThresholdPanel
              threshold={settings.creatorThreshold}
              onCommit={(creatorThreshold) => setThreshold.mutate({ creatorThreshold })}
            />
          </Reveal>
          <RecencyPanel
            days={settings.recencyDays}
            onCommit={(recencyDays) => setRecencyDays.mutate({ recencyDays })}
          />
          <DrawerClose
            render={
              <Button className="mt-[18px] h-[52px] w-full rounded-full text-base font-semibold shadow-[0_10px_22px_-10px_var(--accent)]" />
            }
          >
            Fatto
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
