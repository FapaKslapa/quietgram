import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { type MessageKind, threadPreview } from "@/lib/messages";
import { formatThreadTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export type ThreadSummary = {
  id: string;
  title: string;
  lastActivityAt: number;
  unread: boolean;
  preview: string | null;
  previewKind: MessageKind | null;
};

type ThreadRowProps = { thread: ThreadSummary; now: number };

export function ThreadRow({ thread, now }: ThreadRowProps) {
  return (
    <Link
      href={`/messaggi/${thread.id}`}
      className="flex min-w-0 items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent active:bg-accent"
    >
      <UserAvatar username={thread.title} avatarUrl={null} size="md" />
      <div className="relative min-w-0 flex-1">
        <strong
          className={cn(
            "block truncate leading-tight",
            thread.unread ? "font-bold" : "font-semibold",
          )}
        >
          {thread.title}
        </strong>
        {thread.unread ? <span className="sr-only">Messaggi non letti</span> : null}
        <p
          className={cn(
            "truncate text-sm",
            thread.unread ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {threadPreview(thread.preview, thread.previewKind)}
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
