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
      className="inline-flex h-10 items-center gap-1.5 rounded-full border bg-background pr-3 pl-4 text-sm font-semibold transition-colors hover:bg-accent active:translate-y-px"
    >
      <span aria-hidden="true">{label}</span>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={2}
        className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
      />
    </button>
  );
}
