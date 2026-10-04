import type { WeaveVariant } from "@/lib/weave";

export type WeaveSurface = "card" | "head" | "option" | "bar";

type WeaveProps = {
  variant: WeaveVariant;
  surface: WeaveSurface;
  active?: boolean;
  className?: string;
};

export function Weave({ variant, surface, active, className }: WeaveProps) {
  return (
    <span
      aria-hidden="true"
      className={className ? `weave ${className}` : "weave"}
      data-weave={variant}
      data-surface={surface}
      data-active={active === undefined ? undefined : String(active)}
    />
  );
}
