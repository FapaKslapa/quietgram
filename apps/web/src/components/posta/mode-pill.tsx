import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ModePillProps = { label: string; open: boolean; onClick: () => void };

export function ModePill({ label, open, onClick }: ModePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Cosa leggi: ${label}. Cambia`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sheet pr-3.5 pl-4 text-[0.9375rem] font-semibold shadow-[0_0_0_1px_var(--line)] transition-[box-shadow,transform] duration-300 hover:shadow-[0_0_0_1px_var(--accent)] active:scale-[0.97]"
    >
      <span key={label} className="roll inline-block" aria-hidden="true">
        {label}
      </span>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={2}
        className={cn(
          "size-4 transition-transform duration-500 ease-out-expo",
          open && "rotate-180",
        )}
      />
    </button>
  );
}
