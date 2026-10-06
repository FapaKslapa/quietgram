import { Button } from "@/components/ui/button";
import type { RefreshProgress } from "@/hooks/use-refresh";

type RefreshPanelProps = {
  label: string;
  last: string;
  next: string;
  disabled: boolean;
  progress: RefreshProgress | null;
  onRefresh: () => void;
};

function ProgressStrip({ progress }: { progress: RefreshProgress }) {
  const known = progress.total > 0;
  const percent = known ? Math.min(100, (progress.completed / progress.total) * 100) : 100;

  return (
    <div
      role="progressbar"
      aria-label="Aggiornamento in corso"
      aria-valuemin={0}
      aria-valuemax={known ? progress.total : undefined}
      aria-valuenow={known ? progress.completed : undefined}
      className="mt-5 grid gap-2"
    >
      <div
        className="flex items-baseline justify-between text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span>Aggiornamento in corso</span>
        {known ? (
          <span className="num-display">
            {progress.completed} / {progress.total}
          </span>
        ) : null}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={
            known
              ? "h-full rounded-full bg-primary transition-[width] duration-700 ease-out-expo"
              : "h-full rounded-full bg-primary motion-safe:animate-pulse"
          }
          style={{ width: known ? `${percent}%` : "35%" }}
        />
      </div>
    </div>
  );
}

export function RefreshPanel({
  label,
  last,
  next,
  disabled,
  progress,
  onRefresh,
}: RefreshPanelProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="poster mt-1.5" suppressHydrationWarning>
        {last}
      </p>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p id="refresh-info" className="text-sm text-muted-foreground" suppressHydrationWarning>
          {next}
        </p>
        <Button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          aria-busy={progress !== null}
          aria-describedby="refresh-info"
          className="flex-none"
        >
          Aggiorna
        </Button>
      </div>
      {progress ? <ProgressStrip progress={progress} /> : null}
    </div>
  );
}
