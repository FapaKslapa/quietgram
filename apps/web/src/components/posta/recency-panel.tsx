"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { RECENCY_STEPS, recencyAt, recencyIndex } from "@/lib/feed-modes";

type RecencyPanelProps = {
  days: number;
  onCommit: (days: number) => void;
};

const LAST_INDEX = RECENCY_STEPS.length - 1;

const firstOf = (value: number | readonly number[]): number =>
  typeof value === "number" ? value : (value[0] ?? 0);

export function RecencyPanel({ days, onCommit }: RecencyPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const shown = dragIndex ?? recencyIndex(days);

  return (
    <section className="mt-2.5 grid gap-3 rounded-[22px] bg-sheet px-[18px] py-4 shadow-[0_0_0_1px_var(--line)]">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-base font-semibold tracking-normal">
          Mostra gli ultimi {recencyAt(shown)} giorni
        </h3>
      </header>
      <Slider
        min={0}
        max={LAST_INDEX}
        step={1}
        value={[shown]}
        thumbLabel="Giorni da mostrare"
        valueText={(index) => `Ultimi ${recencyAt(index)} giorni`}
        onValueChange={(value) => setDragIndex(firstOf(value))}
        onValueCommitted={(value) => {
          onCommit(recencyAt(firstOf(value)));
          setDragIndex(null);
        }}
      />
      <div className="num flex justify-between text-xs text-soft" aria-hidden="true">
        <span>{RECENCY_STEPS[0]}</span>
        <span>{RECENCY_STEPS[LAST_INDEX]}</span>
      </div>
    </section>
  );
}
