import { Skeleton } from "@/components/ui/skeleton";

export function LetterSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-3 mb-4 overflow-hidden rounded-[28px] bg-sheet shadow-(--shadow-letter)"
    >
      <div className="flex items-center gap-3 px-[18px] pt-4 pb-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mx-2 aspect-4/5 rounded-[22px]" />
      <div className="grid gap-2 px-5 pt-3.5 pb-5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}
