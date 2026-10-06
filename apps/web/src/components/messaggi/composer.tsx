"use client";

import { SendHorizontal } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  canSubmit,
  composerHint,
  counterLabel,
  isOverLimit,
  MAX_MESSAGE_LENGTH,
  showCounter,
} from "@/lib/messages";
import { cn } from "@/lib/utils";

type ComposerProps = { onSend: (text: string) => Promise<boolean>; enabled: boolean };

export function Composer({ onSend, enabled }: ComposerProps) {
  const [text, setText] = useState("");
  const sendable = canSubmit(text, enabled);
  const hint = composerHint(enabled);

  const submit = async () => {
    if (!canSubmit(text, enabled)) return;
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
      className="flex items-end gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative min-w-0 flex-1">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={!enabled}
          enterKeyHint="send"
          aria-label="Scrivi un messaggio"
          placeholder="Scrivi un messaggio"
          aria-invalid={isOverLimit(text) || undefined}
          className="max-h-36 min-h-11 resize-none rounded-xl py-2.5 leading-6"
        />
        {showCounter(text) ? (
          <span
            aria-live="polite"
            className={cn(
              "num-display pointer-events-none absolute right-4 -top-5 text-xs",
              isOverLimit(text) ? "font-semibold text-destructive" : "text-muted-foreground",
            )}
          >
            <span className="sr-only">Caratteri rimasti su {MAX_MESSAGE_LENGTH}: </span>
            {counterLabel(text)}
          </span>
        ) : null}
        {hint ? <p className="px-4 pt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Button
        type="submit"
        disabled={!sendable}
        aria-label="Invia"
        size="icon"
        className="flex-none"
      >
        <SendHorizontal className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </form>
  );
}
