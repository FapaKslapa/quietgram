import { cn } from "@/lib/utils";
import type { WeaveVariant } from "@/lib/weave";

const CANCELLATION: Record<WeaveVariant, string> = {
  double: "M64 36q6-5 12 0t12 0M64 46q6-5 12 0t12 0M64 56q6-5 12 0t12 0",
  wave: "M64 40q6-8 12 0t12 0M64 52q6-8 12 0t12 0",
  arch: "M64 58a8 8 0 0 1 16 0M72 58a8 8 0 0 1 16 0M64 46a8 8 0 0 1 16 0M72 46a8 8 0 0 1 16 0",
  hatch: "M62 56l9-18M70 56l9-18M78 56l9-18M86 56l9-18",
};

type PostmarkProps = {
  top: string;
  bottom: string;
  variant?: WeaveVariant;
  topSize?: number;
  className?: string;
};

export function Postmark({
  top,
  bottom,
  variant = "double",
  topSize = 10,
  className,
}: PostmarkProps) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className={cn("text-accent", className)}>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <circle cx="40" cy="48" r="30" />
        <circle cx="40" cy="48" r="24" strokeOpacity=".5" />
        <path key={variant} d={CANCELLATION[variant]} className="roll" />
      </g>
      <g
        fill="currentColor"
        textAnchor="middle"
        className="num font-sans"
        style={{ fontWeight: 500 }}
      >
        <text key={top} x="40" y="45" fontSize={topSize} letterSpacing=".04em" className="roll">
          {top}
        </text>
        <text x="40" y="58" fontSize="8" opacity=".75">
          {bottom}
        </text>
      </g>
    </svg>
  );
}
