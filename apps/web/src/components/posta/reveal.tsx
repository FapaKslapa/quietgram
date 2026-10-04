import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = { open: boolean; children: ReactNode };

export function Reveal({ open, children }: RevealProps) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out-expo",
        open ? "mt-[18px] grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="-mx-1 overflow-hidden px-1 pb-[3px]">{children}</div>
    </div>
  );
}
