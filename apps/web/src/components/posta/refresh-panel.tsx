import { Button } from "@/components/ui/button";
import type { RefreshProgress } from "@/hooks/use-refresh";

type RefreshPanelProps = {
  hint: string | null;
  disabled: boolean;
  progress: RefreshProgress | null;
  onRefresh: () => void;
};

const progressLabel = (progress: RefreshProgress): string =>
  progress.authors
    ? `Controllo ${progress.authors.checked} di ${progress.authors.total} account`
    : "Aggiornamento in corso";

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
        <span>{progressLabel(progress)}</span>
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

export function RefreshPanel({ hint, disabled, progress, onRefresh }: RefreshPanelProps) {
  return (
    <div>
      <div className="flex items-center gap-4">
        {hint ? (
          <p id="refresh-info" className="min-w-0 text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          aria-busy={progress !== null}
          aria-describedby={hint ? "refresh-info" : undefined}
          className="ml-auto flex-none"
        >
          Aggiorna
        </Button>
      </div>
      {progress ? <ProgressStrip progress={progress} /> : null}
    </div>
  );
}
