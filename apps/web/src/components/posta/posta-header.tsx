import type { ReactNode } from "react";
import { Weave } from "@/components/brand/weave";
import { ModePill } from "@/components/posta/mode-pill";
import { MODES, type ModeDefinition } from "@/lib/feed-modes";

type PostaHeaderProps = {
  mode: ModeDefinition;
  modesOpen: boolean;
  onOpenModes: () => void;
  children: ReactNode;
};

export function PostaHeader({ mode, modesOpen, onOpenModes, children }: PostaHeaderProps) {
  return (
    <header className="relative isolate mb-4">
      {MODES.map((definition) => (
        <Weave
          key={definition.mode}
          variant={definition.weave}
          surface="head"
          active={definition.mode === mode.mode}
        />
      ))}
      <div className="column px-5 pt-8 pb-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.025em]">Posta</h1>
          <ModePill label={mode.label} open={modesOpen} onClick={onOpenModes} />
        </div>
        {children}
      </div>
    </header>
  );
}
