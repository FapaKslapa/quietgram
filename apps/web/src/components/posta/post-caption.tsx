"use client";

import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

type PostCaptionProps = { username: string; caption: string };

const COLLAPSED_LINES = 3;

export function PostCaption({ username, caption }: PostCaptionProps) {
  const body = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const node = body.current;
    if (!node) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
      const limit = Math.round(lineHeight * COLLAPSED_LINES);
      setCollapsedHeight(limit);
      setOverflowing(node.scrollHeight > limit + 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const clamped = overflowing && collapsedHeight !== null;

  return (
    <div className="max-w-[65ch] px-4 pt-3 pb-4 text-[0.9375rem] leading-normal">
      <motion.div
        initial={false}
        animate={{ height: clamped && !expanded ? collapsedHeight : "auto" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
        style={
          collapsedHeight === null ? { maxHeight: `${COLLAPSED_LINES * 1.5 * 0.9375}rem` } : {}
        }
      >
        <p ref={body} className="whitespace-pre-line">
          <b className="font-semibold">{username}</b> {caption}
        </p>
      </motion.div>
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
