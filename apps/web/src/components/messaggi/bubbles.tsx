import type { ConversationItem } from "@/lib/messages";
import { cn } from "@/lib/utils";

type BubblesProps = { items: ConversationItem[]; pendingKeys: ReadonlySet<string> };

export function Bubbles({ items, pendingKeys }: BubblesProps) {
  return (
    <ol className="grid content-start gap-2 px-4 py-5">
      {items.map((item) =>
        item.kind === "day" ? (
          <li
            key={item.key}
            className="justify-self-center pt-2 pb-1 text-xs font-medium text-muted-foreground"
          >
            {item.label}
          </li>
        ) : (
          <li
            key={item.key}
            className={cn(
              "max-w-[80%] rounded-lg px-4 py-2.5 text-[0.9375rem] break-words whitespace-pre-wrap transition-opacity",
              item.mine
                ? "justify-self-end rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm border bg-card",
              pendingKeys.has(item.key) && "opacity-70",
            )}
          >
            {item.text}
            <small className="num-display mt-1 block text-[0.6875rem] opacity-60">
              {item.time}
            </small>
          </li>
        ),
      )}
    </ol>
  );
}
