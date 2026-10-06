"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ConversationItem } from "@/lib/messages";
import { cn } from "@/lib/utils";

type BubblesProps = {
  items: ConversationItem[];
  pendingKeys: ReadonlySet<string>;
  enterKeys?: ReadonlySet<string> | undefined;
};

const ENTER = { duration: 0.2, ease: [0.16, 1, 0.3, 1] } as const;

export function Bubbles({ items, pendingKeys, enterKeys }: BubblesProps) {
  const reduced = useReducedMotion();

  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] content-start px-4 py-5">
      {items.map((item) => {
        if (item.kind === "day") {
          return (
            <li
              key={item.key}
              className="justify-self-center pt-4 pb-2 text-xs font-medium text-muted-foreground first:pt-0"
            >
              {item.label}
            </li>
          );
        }
        const animated = !reduced && enterKeys?.has(item.key) === true;
        return (
          <motion.li
            key={item.key}
            initial={animated ? { opacity: 0, y: 8, scale: 0.98 } : false}
            animate={{ opacity: pendingKeys.has(item.key) ? 0.7 : 1, y: 0, scale: 1 }}
            transition={ENTER}
            style={{ originX: item.mine ? 1 : 0, originY: 1 }}
            className={cn(
              "max-w-[80%] min-w-0 rounded-lg px-4 py-2.5 text-[0.9375rem] whitespace-pre-wrap [overflow-wrap:anywhere]",
              item.first ? "mt-3 first:mt-0" : "mt-0.5",
              item.mine
                ? "justify-self-end bg-primary text-primary-foreground"
                : "justify-self-start border bg-card",
              item.mine
                ? item.last
                  ? "rounded-br-sm"
                  : "rounded-br-md"
                : item.last
                  ? "rounded-bl-sm"
                  : "rounded-bl-md",
            )}
          >
            {item.text ?? <span className="italic opacity-70">{item.attachment}</span>}
            {item.last ? (
              <small className="num-display mt-1 block text-[0.6875rem] opacity-60">
                {item.time}
              </small>
            ) : null}
          </motion.li>
        );
      })}
    </ol>
  );
}
