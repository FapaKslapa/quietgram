import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d"] as const;

export function ThreadSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-2.5 px-3 pb-5">
      {PLACEHOLDERS.map((key) => (
        <div
          key={key}
          className="flex items-center gap-3.5 rounded-3xl bg-sheet px-4 py-3.5 shadow-[0_0_0_1px_var(--line)]"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}
