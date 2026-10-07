"use client";

import { ArrowUp, Heart } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  type CommentRow,
  canPostComment,
  isPendingComment,
  remainingComment,
  showCommentCounter,
  threadComments,
} from "@/lib/comments";
import { formatCount } from "@/lib/count-format";
import { INTERACTIONS_OFF_HINT } from "@/lib/interactions";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export type CommentsState = "loading" | "error" | "ready";

type CommentsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: CommentsState;
  rows: CommentRow[];
  now: number;
  composerEnabled: boolean;
  onSubmit: (text: string) => void;
  onRetry: () => void;
};

function CommentItem({ row, now, reply }: { row: CommentRow; now: number; reply: boolean }) {
  return (
    <div className={cn("flex gap-3", reply && "ml-11", isPendingComment(row) && "opacity-60")}>
      <UserAvatar
        username={row.username}
        avatarUrl={row.avatarUrl}
        className={reply ? "size-6" : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug break-words whitespace-pre-line">
          <b className="font-semibold">{row.username}</b> {row.text}
        </p>
        <p className="num-display mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <time dateTime={new Date(row.createdAt).toISOString()} suppressHydrationWarning>
            {isPendingComment(row) ? "Invio" : formatRelativeTime(row.createdAt, now)}
          </time>
          {row.likeCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" strokeWidth={2} aria-hidden="true" />
              {formatCount(row.likeCount)}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function CommentsLoading() {
  return (
    <div className="grid gap-5" aria-busy="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Composer({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  const allowed = canPostComment(text, true);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!allowed) return;
    onSubmit(text);
    setText("");
  };

  return (
    <form onSubmit={submit} className="grid gap-1.5">
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={1}
          placeholder="Scrivi un commento"
          aria-label="Scrivi un commento"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-full py-2.5"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!allowed}
          aria-label="Pubblica commento"
          className="rounded-full"
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
      {showCommentCounter(text) ? (
        <p
          className={cn(
            "num-display px-4 text-xs",
            remainingComment(text) < 0 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {remainingComment(text)}
        </p>
      ) : null}
    </form>
  );
}

export function CommentsSheet({
  open,
  onOpenChange,
  state,
  rows,
  now,
  composerEnabled,
  onSubmit,
  onRetry,
}: CommentsSheetProps) {
  const threads = threadComments(rows);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="h-[78dvh]">
        <DrawerHeader className="pb-3">
          <DrawerTitle>Commenti</DrawerTitle>
          <DrawerDescription className="sr-only">Commenti di questo post</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          {state === "loading" ? <CommentsLoading /> : null}
          {state === "error" ? (
            <div role="alert" className="grid justify-items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">Non riesco a leggere i commenti.</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Riprova
              </Button>
            </div>
          ) : null}
          {state === "ready" && threads.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ancora nessun commento.
            </p>
          ) : null}
          {state === "ready" ? (
            <ul className="grid gap-5">
              {threads.map(({ comment, replies }) => (
                <li key={comment.id} className="grid gap-4">
                  <CommentItem row={comment} now={now} reply={false} />
                  {replies.map((row) => (
                    <CommentItem key={row.id} row={row} now={now} reply />
                  ))}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="shrink-0 border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {composerEnabled ? (
            <Composer onSubmit={onSubmit} />
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {INTERACTIONS_OFF_HINT}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
