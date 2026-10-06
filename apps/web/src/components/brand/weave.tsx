import type { WeaveVariant } from "@/lib/weave";

export type WeaveSurface = "head" | "divider";

type WeaveProps = {
  variant: WeaveVariant;
  surface: WeaveSurface;
  active?: boolean;
};

export function Weave({ variant, surface, active }: WeaveProps) {
  return (
    <span
      aria-hidden="true"
      className="weave"
      data-weave={variant}
      data-surface={surface}
      data-active={active === undefined ? undefined : String(active)}
    />
  );
}
