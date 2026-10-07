import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ringState, type TrayEntry } from "@/lib/stories";
import { cn } from "@/lib/utils";

const BAR_FRAME = "mb-1 h-28";
const BAR_SCROLLER =
  "column flex h-full items-start gap-3.5 overflow-x-auto px-5 py-2 scroll-px-5 [scrollbar-width:none]";

type StoriesBarViewProps = { entries: TrayEntry[]; onOpen: (index: number) => void };

export function StoriesBarView({ entries, onOpen }: StoriesBarViewProps) {
  return (
    <nav aria-label="Storie" className={BAR_FRAME}>
      <ul className={BAR_SCROLLER}>
        {entries.map((entry, index) => {
          const unseen = ringState(entry) === "unseen";
          return (
            <li key={entry.userId} className="w-[4.5rem] flex-none">
              <button
                type="button"
                onClick={() => onOpen(index)}
                aria-label={`Storia di ${entry.username}${unseen ? ", da vedere" : ""}`}
                className="grid w-full justify-items-center gap-1.5 rounded-md active:scale-95"
              >
                <span
                  className={cn(
                    "grid size-[4.5rem] place-items-center rounded-full p-[3px] ring-2 ring-offset-2 ring-offset-background transition-colors duration-300",
                    unseen ? "ring-foreground" : "ring-border",
                  )}
                >
                  <UserAvatar
                    username={entry.username}
                    avatarUrl={entry.avatarUrl}
                    size="lg"
                    className="size-full"
                  />
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center text-xs leading-4 transition-colors duration-300",
                    unseen ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {entry.username}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StoriesBarSkeleton() {
  return (
    <div aria-hidden="true" className={cn(BAR_FRAME, "overflow-hidden")}>
      <div className={cn(BAR_SCROLLER, "overflow-hidden")}>
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="grid w-[4.5rem] flex-none justify-items-center gap-1.5">
            <Skeleton className="size-[4.5rem] rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

type StoriesBarMessageProps = { message: string; onRetry: () => void; retrying: boolean };

export function StoriesBarMessage({ message, onRetry, retrying }: StoriesBarMessageProps) {
  return (
    <div className={cn(BAR_FRAME, "grid place-content-center justify-items-center gap-1 px-5")}>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onRetry} disabled={retrying}>
        Riprova
      </Button>
    </div>
  );
}
