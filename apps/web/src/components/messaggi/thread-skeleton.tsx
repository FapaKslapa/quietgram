import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d"] as const;

export function ThreadSkeleton() {
  return (
    <div aria-hidden="true" className="column grid px-4 pb-5">
      {PLACEHOLDERS.map((key) => (
        <div key={key} className="flex items-center gap-3 px-2 py-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}
