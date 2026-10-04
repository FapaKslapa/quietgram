import type { ReactNode } from "react";
import { Weave } from "@/components/brand/weave";
import type { WeaveVariant } from "@/lib/weave";

type ScreenHeaderProps = {
  title: string;
  variant?: WeaveVariant;
  children?: ReactNode;
};

export function ScreenHeader({ title, variant = "wave", children }: ScreenHeaderProps) {
  return (
    <header className="relative isolate flex items-center justify-between gap-3 px-5 pt-7 pb-[18px]">
      <Weave variant={variant} surface="head" active />
      <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.035em]">{title}</h1>
      {children}
    </header>
  );
}
