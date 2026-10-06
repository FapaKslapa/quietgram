import { formatClock } from "@/lib/time";

type BudgetLockViewProps = { minutes: number | null; reopensAt: number };

export function BudgetLockView({ minutes, reopensAt }: BudgetLockViewProps) {
  return (
    <section
      aria-labelledby="budget-lock-title"
      className="fixed inset-0 z-30 grid place-items-center bg-background px-8 pb-28"
    >
      <div className="column grid justify-items-center gap-6 text-center">
        {minutes === null ? null : (
          <p
            aria-hidden="true"
            className="poster"
            style={{ fontSize: "clamp(4.5rem, 30vw, 6rem)" }}
          >
            {minutes}
          </p>
        )}
        <div className="grid gap-2">
          <h2 id="budget-lock-title" className="text-xl font-bold tracking-[-0.025em]">
            Hai finito per ora.
          </h2>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {minutes === null ? "" : `${minutes} minuti di Posta. `}
            Si riapre alle <span className="num-display">{formatClock(reopensAt)}</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
