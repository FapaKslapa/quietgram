"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Weave } from "@/components/brand/weave";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/hooks/use-cooldown";
import { type RefreshProgress, useRefresh } from "@/hooks/use-refresh";
import { formatClock } from "@/lib/time";
import { useTRPC } from "@/trpc/client";

function ProgressStrip({ progress }: { progress: RefreshProgress }) {
  const known = progress.total > 0;
  const percent = known ? Math.min(100, (progress.completed / progress.total) * 100) : 100;

  return (
    <div
      role="progressbar"
      aria-label="Ritiro in corso"
      aria-valuemin={0}
      aria-valuemax={known ? progress.total : undefined}
      aria-valuenow={known ? progress.completed : undefined}
      className="mt-3.5 grid gap-2"
    >
      <div
        className="flex items-baseline justify-between text-[0.8125rem] text-soft"
        aria-live="polite"
      >
        <span>Ritiro in corso</span>
        {known ? (
          <span className="num">
            {progress.completed} / {progress.total}
          </span>
        ) : null}
      </div>
      <div className="relative isolate h-2.5 overflow-hidden rounded-full bg-line/60">
        <div
          className={
            known
              ? "relative isolate h-full overflow-hidden rounded-full bg-accent/25 transition-[width] duration-700 ease-out-expo"
              : "relative isolate h-full overflow-hidden rounded-full bg-accent/25 motion-safe:animate-pulse"
          }
          style={{ width: `${percent}%` }}
        >
          <Weave variant="hatch" surface="bar" className="drift" />
        </div>
      </div>
    </div>
  );
}

export function RefreshRow() {
  const trpc = useTRPC();
  const { data: overview } = useSuspenseQuery(trpc.refresh.overview.queryOptions());
  const { refresh, progress } = useRefresh();
  const cooling = useCooldown(overview.nextRefreshAt);
  const running = progress !== null;

  const last = overview.lastRefreshAt === null ? "mai" : formatClock(overview.lastRefreshAt);
  const next =
    overview.nextRefreshAt !== null && cooling
      ? `dalle ${formatClock(overview.nextRefreshAt)}`
      : "ora";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <dl
          id="refresh-info"
          className="num grid grid-cols-[auto_auto] gap-x-3.5 gap-y-0.5 text-[0.8125rem]"
        >
          <dt className="text-soft">Ultimo ritiro</dt>
          <dd className="font-medium">
            <span key={last} className="roll inline-block" suppressHydrationWarning>
              {last}
            </span>
          </dd>
          <dt className="text-soft">Prossimo</dt>
          <dd className="font-medium text-accent">
            <span key={next} className="roll inline-block" suppressHydrationWarning>
              {next}
            </span>
          </dd>
        </dl>
        <Button
          type="button"
          onClick={() => void refresh()}
          disabled={cooling || running}
          aria-busy={running}
          aria-describedby="refresh-info"
          className="h-[46px] rounded-full px-5 text-[0.9375rem] font-semibold shadow-(--shadow-lift) transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-px hover:bg-primary disabled:bg-line disabled:text-soft disabled:opacity-100 disabled:shadow-none"
        >
          Ritira la posta
        </Button>
      </div>
      {progress ? <ProgressStrip progress={progress} /> : null}
    </div>
  );
}
