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
    <section className="grid gap-3 pt-6">
      <h3 className="text-base font-semibold">
        Ultimi <span className="num-display">{recencyAt(shown)}</span> giorni
      </h3>
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
      <div
        className="num-display flex justify-between text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span>{RECENCY_STEPS[0]}</span>
        <span>{RECENCY_STEPS[LAST_INDEX]}</span>
      </div>
    </section>
  );
}
