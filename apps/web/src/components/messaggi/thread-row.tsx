import Link from "next/link";
import { AuthorAvatar } from "@/components/posta/author-avatar";
import { formatThreadTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export type ThreadSummary = {
  id: string;
  title: string;
  lastActivityAt: number;
  unread: boolean;
  preview: string | null;
};

type ThreadRowProps = { thread: ThreadSummary; now: number };

export function ThreadRow({ thread, now }: ThreadRowProps) {
  return (
    <Link
      href={`/messaggi/${thread.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent active:bg-accent"
    >
      <AuthorAvatar username={thread.title} avatarUrl={null} className="size-11 text-sm" />
      <div className="min-w-0 flex-1">
        <strong
          className={cn(
            "block truncate leading-tight",
            thread.unread ? "font-bold" : "font-semibold",
          )}
        >
          {thread.title}
          {thread.unread ? <span className="sr-only">, messaggi non letti</span> : null}
        </strong>
        <p
          className={cn(
            "truncate text-sm",
            thread.unread ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {thread.preview ?? "Nessun messaggio"}
        </p>
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5">
        <time
          dateTime={new Date(thread.lastActivityAt).toISOString()}
          className={cn(
            "num-display text-xs",
            thread.unread ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
          suppressHydrationWarning
        >
          {formatThreadTime(thread.lastActivityAt, now)}
        </time>
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", thread.unread ? "bg-foreground" : "bg-transparent")}
        />
      </div>
    </Link>
  );
}
