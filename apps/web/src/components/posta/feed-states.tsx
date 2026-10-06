import { Weave } from "@/components/brand/weave";
import { type FeedPost, PostCard } from "@/components/posta/post-card";
import { Button } from "@/components/ui/button";
import type { WeaveVariant } from "@/lib/weave";

export function PostList({ posts, now }: { posts: FeedPost[]; now: number }) {
  return (
    <div className="column px-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} now={now} />
      ))}
    </div>
  );
}

export function FeedEmpty({ onOpenModes }: { onOpenModes: () => void }) {
  return (
    <section className="column grid justify-items-center gap-2 px-8 pt-16 pb-16 text-center">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Nessun post per ora</h2>
      <p className="max-w-[30ch] text-sm text-balance text-muted-foreground">
        Aggiorna oppure cambia cosa vuoi leggere.
      </p>
      <Button type="button" variant="outline" onClick={onOpenModes} className="mt-4">
        Cosa vuoi leggere?
      </Button>
    </section>
  );
}

export function FeedEnd({ variant }: { variant: WeaveVariant }) {
  return (
    <section className="column grid gap-6 px-4 pt-4 pb-12 text-center">
      <Weave variant={variant} surface="divider" />
      <p className="text-sm font-medium text-muted-foreground">Sei in pari.</p>
    </section>
  );
}

export function FeedMoreError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="column grid justify-items-center gap-3 px-8 py-6 text-center text-sm text-muted-foreground"
    >
      <p>Non sono riuscito a caricare altri post.</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Riprova
      </Button>
    </div>
  );
}
