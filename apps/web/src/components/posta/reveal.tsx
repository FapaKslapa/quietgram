import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = { open: boolean; children: ReactNode };

export function Reveal({ open, children }: RevealProps) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
