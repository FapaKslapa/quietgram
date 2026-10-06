"use client";

import { useState } from "react";
import { collapseCaption } from "@/lib/caption";

type LetterCaptionProps = { username: string; caption: string };

export function LetterCaption({ username, caption }: LetterCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const view = collapseCaption(caption);
  const collapsed = view.collapsed && !expanded;

  return (
    <p className="max-w-[65ch] whitespace-pre-line px-5 pt-3.5 pb-5 text-[0.96875rem] leading-normal">
      <b className="font-semibold">{username}</b> {collapsed ? `${view.text}… ` : caption}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-sm font-medium text-soft underline decoration-line underline-offset-4 transition-colors hover:text-ink"
        >
          altro
        </button>
      ) : null}
    </p>
  );
}
