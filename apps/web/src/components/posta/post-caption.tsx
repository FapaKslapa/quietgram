"use client";

import { useState } from "react";
import { collapseCaption } from "@/lib/caption";

type PostCaptionProps = { username: string; caption: string };

export function PostCaption({ username, caption }: PostCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const view = collapseCaption(caption);
  const collapsed = view.collapsed && !expanded;

  return (
    <p className="max-w-[65ch] px-4 pt-3 pb-4 text-[0.9375rem] leading-normal whitespace-pre-line">
      <b className="font-semibold">{username}</b> {collapsed ? `${view.text}… ` : caption}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          altro
        </button>
      ) : null}
    </p>
  );
}
