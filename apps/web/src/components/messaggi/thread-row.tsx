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
      className="flex items-center gap-3.5 rounded-3xl bg-sheet px-4 py-3.5 shadow-[0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-300 ease-out-expo hover:shadow-[0_0_0_1px_var(--soft)] active:scale-[0.99]"
    >
      <AuthorAvatar authorId={thread.id} username={thread.title} avatarUrl={null} />
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
        <p className={cn("truncate text-sm", thread.unread ? "font-medium text-ink" : "text-soft")}>
          {thread.preview ?? "Nessun messaggio"}
        </p>
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5">
        <time
          dateTime={new Date(thread.lastActivityAt).toISOString()}
          className={cn("num text-xs", thread.unread ? "font-semibold text-accent" : "text-soft")}
          suppressHydrationWarning
        >
          {formatThreadTime(thread.lastActivityAt, now)}
        </time>
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", thread.unread ? "bg-accent" : "bg-transparent")}
        />
      </div>
    </Link>
  );
}
