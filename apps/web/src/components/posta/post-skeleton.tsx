import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div aria-hidden="true" className="mb-3 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <Skeleton className="aspect-4/5 rounded-none" />
      <div className="grid gap-2 px-4 pt-3 pb-4">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}
