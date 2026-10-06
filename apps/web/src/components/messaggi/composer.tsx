"use client";

import { LoaderCircle, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
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

const MAX_LINES = 4;
const LINE_HEIGHT_PX = 24;
const VERTICAL_PADDING_PX = 20;
const MAX_HEIGHT_PX = MAX_LINES * LINE_HEIGHT_PX + VERTICAL_PADDING_PX;

export function Composer({ onSend, enabled }: ComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const sendable = canSubmit(text, enabled) && !sending;
  const hint = composerHint(enabled);

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`;
  });

  const submit = async () => {
    if (!sendable) return;
    const value = text;
    setText("");
    setSending(true);
    const delivered = await onSend(value);
    setSending(false);
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
      className="border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="column flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={field}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={!enabled}
            enterKeyHint="send"
            aria-label="Scrivi un messaggio"
            placeholder="Scrivi un messaggio"
            aria-invalid={isOverLimit(text) || undefined}
            style={{ maxHeight: MAX_HEIGHT_PX }}
            className="min-h-11 resize-none overflow-y-auto rounded-xl py-2.5 leading-6 field-sizing-fixed"
          />
          {showCounter(text) ? (
            <span
              aria-live="polite"
              className={cn(
                "num-display pointer-events-none absolute -top-5 right-4 text-xs",
                isOverLimit(text) ? "font-semibold text-destructive" : "text-muted-foreground",
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
          aria-label={sending ? "Invio in corso" : "Invia"}
          aria-busy={sending}
          size="icon"
          className="flex-none"
        >
          {sending ? (
            <LoaderCircle
              className="size-5 motion-safe:animate-spin"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          ) : (
            <SendHorizontal className="size-5" strokeWidth={1.8} aria-hidden="true" />
          )}
        </Button>
      </div>
      {hint ? (
        <p className="column px-1 pt-2 text-xs text-muted-foreground">
          <Link href="/profilo" className="underline-offset-4 hover:underline">
            {hint}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
