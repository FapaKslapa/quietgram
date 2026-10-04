import type { ConversationItem } from "@/lib/messages";
import { cn } from "@/lib/utils";

type BubblesProps = { items: ConversationItem[]; pendingKeys: ReadonlySet<string> };

export function Bubbles({ items, pendingKeys }: BubblesProps) {
  return (
    <ol className="grid content-start gap-2.5 px-4 py-[18px]">
      {items.map((item) =>
        item.kind === "day" ? (
          <li key={item.key} className="justify-self-center pt-1 pb-1.5 text-xs text-soft">
            {item.label}
          </li>
        ) : (
          <li
            key={item.key}
            className={cn(
              "max-w-[80%] px-4 py-[11px] break-words whitespace-pre-wrap transition-opacity",
              item.mine
                ? "justify-self-end rounded-[22px_8px_22px_22px] bg-ink text-paper"
                : "rounded-[8px_22px_22px_22px] bg-sheet shadow-[0_0_0_1px_var(--line)]",
              pendingKeys.has(item.key) && "opacity-70",
            )}
          >
            {item.text}
            <small className="num mt-[3px] block text-[0.6875rem] opacity-65">{item.time}</small>
          </li>
        ),
      )}
    </ol>
  );
}
