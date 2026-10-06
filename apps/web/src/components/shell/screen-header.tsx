import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Weave } from "@/components/brand/weave";
import type { WeaveVariant } from "@/lib/weave";

type ScreenHeaderProps = {
  title: string;
  variant?: WeaveVariant;
  back?: { href: string; label: string };
  children?: ReactNode;
};

export function ScreenHeader({ title, variant = "wave", back, children }: ScreenHeaderProps) {
  return (
    <header className="relative isolate mb-4 overflow-x-clip">
      <Weave variant={variant} surface="head" active />
      <div className="column px-5 pt-8 pb-6">
        {back ? (
          <Link
            href={back.href}
            className="-ml-2 mb-2 inline-flex h-10 items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-5" strokeWidth={1.8} aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.025em]">{title}</h1>
          {children}
        </div>
      </div>
    </header>
  );
}
