"use client";

import { Bookmark, Heart, MessageCircle } from "lucide-react";
import * as m from "motion/react-m";
import type { PostFlags } from "@/lib/interactions";
import { cn } from "@/lib/utils";

type PostActionsProps = {
  flags: PostFlags;
  enabled: boolean;
  onLike: () => void;
  onSave: () => void;
  onComments: () => void;
};

const BUTTON =
  "grid size-11 place-items-center rounded-full text-foreground transition-colors active:bg-accent";

export function PostActions({ flags, enabled, onLike, onSave, onComments }: PostActionsProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 pt-1.5">
      {enabled ? (
        <m.button
          type="button"
          onClick={onLike}
          whileTap={{ scale: 0.82 }}
          aria-pressed={flags.liked}
          aria-label={flags.liked ? "Togli mi piace" : "Mi piace"}
          className={BUTTON}
        >
          <Heart
            className={cn("size-6", flags.liked && "fill-current")}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </m.button>
      ) : flags.liked ? (
        <span role="img" aria-label="Ti piace" className={BUTTON}>
          <Heart className="size-6 fill-current" strokeWidth={1.8} aria-hidden="true" />
        </span>
      ) : null}
      <button type="button" onClick={onComments} aria-label="Commenti" className={BUTTON}>
        <MessageCircle className="size-6" strokeWidth={1.8} aria-hidden="true" />
      </button>
      <span className="flex-1" />
      {enabled ? (
        <m.button
          type="button"
          onClick={onSave}
          whileTap={{ scale: 0.82 }}
          aria-pressed={flags.saved}
          aria-label={flags.saved ? "Rimuovi dai salvati" : "Salva"}
          className={BUTTON}
        >
          <Bookmark
            className={cn("size-6", flags.saved && "fill-current")}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </m.button>
      ) : flags.saved ? (
        <span role="img" aria-label="Salvato" className={BUTTON}>
          <Bookmark className="size-6 fill-current" strokeWidth={1.8} aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}
