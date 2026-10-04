"use client";

import { SendHorizontal } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  canSend,
  counterLabel,
  isOverLimit,
  MAX_MESSAGE_LENGTH,
  showCounter,
} from "@/lib/messages";
import { cn } from "@/lib/utils";

type ComposerProps = { onSend: (text: string) => Promise<boolean> };

export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const sendable = canSend(text);

  const submit = async () => {
    if (!canSend(text)) return;
    const value = text;
    setText("");
    const delivered = await onSend(value);
    if (!delivered) setText((current) => (current === "" ? value : current));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2.5 border-t border-line bg-paper px-3.5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative min-w-0 flex-1">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          enterKeyHint="send"
          aria-label="Scrivi un messaggio"
          placeholder="Scrivi un messaggio"
          aria-invalid={isOverLimit(text) || undefined}
          className="max-h-36 min-h-[46px] resize-none rounded-[26px] border-0 bg-sheet px-[18px] py-[11px] text-base leading-6 shadow-[0_0_0_1px_var(--line)] focus-visible:ring-2 focus-visible:ring-accent dark:bg-sheet"
        />
        {showCounter(text) ? (
          <span
            aria-live="polite"
            className={cn(
              "num pointer-events-none absolute right-4 -top-5 text-xs",
              isOverLimit(text) ? "font-semibold text-destructive" : "text-soft",
            )}
          >
            <span className="sr-only">Caratteri rimasti su {MAX_MESSAGE_LENGTH}: </span>
            {counterLabel(text)}
          </span>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={!sendable}
        aria-label="Invia"
        className="size-[46px] flex-none rounded-full p-0 shadow-(--shadow-lift) disabled:bg-line disabled:text-soft disabled:opacity-100 disabled:shadow-none"
      >
        <SendHorizontal className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </form>
  );
}
