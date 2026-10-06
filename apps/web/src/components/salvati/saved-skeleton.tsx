import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i"] as const;

export function SavedSkeleton() {
  return (
    <div aria-hidden="true" className="column grid grid-cols-3 gap-1.5 px-4 pb-6">
      {PLACEHOLDERS.map((key) => (
        <Skeleton key={key} className="aspect-4/5 rounded-md" />
      ))}
    </div>
  );
}
