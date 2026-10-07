"use client";

import { useLayoutEffect, useRef, useState } from "react";

type PostCaptionProps = { username: string; caption: string };

type Measure = { collapsed: number; full: number };

const COLLAPSED_LINES = 3;
const OVERFLOW_TOLERANCE_PX = 2;

export function PostCaption({ username, caption }: PostCaptionProps) {
  const body = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [measure, setMeasure] = useState<Measure | null>(null);

  useLayoutEffect(() => {
    const node = body.current;
    if (!node) return;
    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
      setMeasure({
        collapsed: Math.round(lineHeight * COLLAPSED_LINES),
        full: node.scrollHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const clamped = measure !== null && measure.full > measure.collapsed + OVERFLOW_TOLERANCE_PX;
  const height = clamped ? (expanded ? measure.full : measure.collapsed) : undefined;

  return (
    <div className="max-w-[65ch] px-4 pt-3 pb-4 text-[0.9375rem] leading-normal">
      <div
        className="overflow-hidden transition-[height] duration-[350ms] ease-out-expo"
        style={
          measure === null ? { maxHeight: `${COLLAPSED_LINES * 1.5 * 0.9375}rem` } : { height }
        }
      >
        <p ref={body} className="whitespace-pre-line">
          <b className="font-semibold">{username}</b> {caption}
        </p>
      </div>
      {clamped ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-8 items-center rounded-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {expanded ? "meno" : "altro"}
        </button>
      ) : null}
    </div>
  );
}
