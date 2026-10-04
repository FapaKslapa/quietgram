"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { formatFollowers, THRESHOLD_STEPS, thresholdAt, thresholdIndex } from "@/lib/feed-modes";

type ThresholdPanelProps = {
  threshold: number;
  onCommit: (threshold: number) => void;
};

const LAST_INDEX = THRESHOLD_STEPS.length - 1;

const firstOf = (value: number | readonly number[]): number =>
  typeof value === "number" ? value : (value[0] ?? 0);

export function ThresholdPanel({ threshold, onCommit }: ThresholdPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const shown = dragIndex ?? thresholdIndex(threshold);

  return (
    <section className="grid gap-3 rounded-[22px] bg-sheet px-[18px] py-4 shadow-[0_0_0_1px_var(--line)]">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-base font-semibold tracking-normal">Soglia</h3>
        <output className="num font-medium text-accent">
          {formatFollowers(thresholdAt(shown))} follower
        </output>
      </header>
      <Slider
        min={0}
        max={LAST_INDEX}
        step={1}
        value={[shown]}
        thumbLabel="Soglia follower"
        valueText={(index) => `${formatFollowers(thresholdAt(index))} follower`}
        onValueChange={(value) => setDragIndex(firstOf(value))}
        onValueCommitted={(value) => {
          onCommit(thresholdAt(firstOf(value)));
          setDragIndex(null);
        }}
      />
      <div className="num flex justify-between text-xs text-soft" aria-hidden="true">
        <span>{formatFollowers(THRESHOLD_STEPS[0])}</span>
        <span>{formatFollowers(THRESHOLD_STEPS[LAST_INDEX] ?? 0)}</span>
      </div>
      <small className="text-soft">Contano anche i profili verificati e le aziende.</small>
    </section>
  );
}
