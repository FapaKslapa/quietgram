import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d", "e", "f"] as const;

export function SavedSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 px-3 pb-6">
      {PLACEHOLDERS.map((key) => (
        <div key={key} className="rounded-3xl bg-sheet p-1.5 shadow-(--shadow-letter)">
          <Skeleton className="aspect-4/5 rounded-[18px]" />
          <Skeleton className="mx-3 my-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
