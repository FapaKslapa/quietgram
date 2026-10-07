"use client";

import { animate, type MotionValue, type PanInfo, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { clampIndex, snapIndex, trackOffset } from "@/lib/carousel";
import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring", stiffness: 420, damping: 42, mass: 0.9 } as const;
const FAR = 2000;

export type SwipeTrackHandle = { goTo: (index: number) => void };

type SwipeTrackProps = {
  handleRef?: Ref<SwipeTrackHandle> | undefined;
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  children: ReactNode;
  label?: string | undefined;
  fixedWidth?: number | undefined;
  y?: MotionValue<number> | undefined;
  onVerticalEnd?: ((info: PanInfo) => void) | undefined;
  onActivate?: ((index: number) => void) | undefined;
  className?: string | undefined;
};

export function SwipeTrack({
  handleRef,
  count,
  index,
  onIndexChange,
  children,
  label,
  fixedWidth,
  y,
  onVerticalEnd,
  onActivate,
  className,
}: SwipeTrackProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(fixedWidth ?? 0);
  const width = fixedWidth ?? measured;
  const x = useMotionValue(trackOffset(index, width));
  const committed = useRef(index);
  const axis = useRef<"x" | "y" | null>(null);
  const vertical = y !== undefined;
  const multiple = count > 1;

  useLayoutEffect(() => {
    if (fixedWidth !== undefined) return;
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setMeasured(node.clientWidth));
    observer.observe(node);
    setMeasured(node.clientWidth);
    return () => observer.disconnect();
  }, [fixedWidth]);

  useLayoutEffect(() => {
    if (width <= 0) return;
    x.jump(trackOffset(committed.current, width));
  }, [width, x]);

  useEffect(() => {
    if (index === committed.current) return;
    committed.current = index;
    x.jump(trackOffset(index, width));
  }, [index, width, x]);

  const commit = useCallback(
    (target: number) => {
      const next = clampIndex(target, count);
      committed.current = next;
      void animate(x, trackOffset(next, width), SNAP_SPRING);
      onIndexChange(next);
    },
    [count, width, x, onIndexChange],
  );

  useImperativeHandle(handleRef, () => ({ goTo: commit }), [commit]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const locked = axis.current;
    axis.current = null;
    if (locked === "y" && onVerticalEnd) {
      onVerticalEnd(info);
      return;
    }
    commit(snapIndex(committed.current, count, info.offset.x, info.velocity.x, width));
  };

  const keys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keys.current = (event) => {
    if (event.key === "Enter" && onActivate && event.target === event.currentTarget) {
      event.preventDefault();
      onActivate(committed.current);
      return;
    }
    if (!multiple) return;
    if (event.key === "ArrowRight") commit(committed.current + 1);
    else if (event.key === "ArrowLeft") commit(committed.current - 1);
    else if (event.key === "Home") commit(0);
    else if (event.key === "End") commit(count - 1);
    else return;
    event.preventDefault();
  };

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const listener = (event: KeyboardEvent) => keys.current(event);
    node.addEventListener("keydown", listener);
    return () => node.removeEventListener("keydown", listener);
  }, []);

  return (
    <section
      ref={frame}
      aria-roledescription={multiple ? "carosello" : "foto"}
      aria-label={label}
      tabIndex={multiple || onActivate ? 0 : undefined}
      className={cn("relative size-full overflow-hidden outline-offset-[-2px]", className)}
    >
      <m.ul
        drag={multiple || vertical ? (vertical ? true : "x") : false}
        dragDirectionLock={vertical}
        dragMomentum={false}
        dragConstraints={{
          left: trackOffset(count - 1, width),
          right: 0,
          top: vertical ? -FAR : 0,
          bottom: vertical ? FAR : 0,
        }}
        dragElastic={{
          left: 0.16,
          right: 0.16,
          top: vertical ? 0.6 : 0,
          bottom: vertical ? 0.6 : 0,
        }}
        onDirectionLock={(locked) => {
          axis.current = locked;
        }}
        onDragEnd={onDragEnd}
        style={y ? { x, y } : { x }}
        className="flex size-full"
      >
        {children}
      </m.ul>
    </section>
  );
}
