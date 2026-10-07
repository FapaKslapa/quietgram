import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountPostsEmpty({ isPrivate }: { isPrivate: boolean }) {
  return (
    <section className="column grid justify-items-center gap-2 px-8 pt-12 pb-16 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">
        {isPrivate ? "Account privato" : "Nessun post"}
      </h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        {isPrivate
          ? "I post sono visibili solo a chi lo segue."
          : "Quando pubblica qualcosa, lo trovi qui."}
      </p>
    </section>
  );
}

export function AccountPostsError({ onRetry }: { onRetry: () => void }) {
  return (
    <section role="alert" className="column grid justify-items-center gap-2 px-8 pt-12 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Non riesco a leggere i post</h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        Instagram non ha risposto. Riprova tra un momento.
      </p>
      <Button type="button" onClick={onRetry} className="mt-4">
        Riprova
      </Button>
    </section>
  );
}

export function AccountPostsSkeleton() {
  return (
    <div aria-busy="true" className="column grid grid-cols-3 gap-1.5 px-4 pb-6">
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <Skeleton key={key} className="aspect-4/5 rounded-md" />
      ))}
    </div>
  );
}

export function AccountHeaderSkeleton() {
  return (
    <div aria-busy="true" className="column grid gap-4 px-5 pb-5">
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-10 flex-1" />
      </div>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
