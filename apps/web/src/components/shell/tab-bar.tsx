"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const TABS = [
  { href: "/posta", label: "Posta", Icon: Mail },
  { href: "/salvati", label: "Salvati", Icon: Bookmark },
  { href: "/messaggi", label: "Messaggi", Icon: MessageSquare },
] as const;

export function TabBar() {
  const trpc = useTRPC();
  const pathname = usePathname();
  const { data: hasUnread = false } = useQuery(
    trpc.messages.threads.queryOptions(undefined, {
      select: (threads) => threads.some((thread) => thread.unread),
    }),
  );

  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper"
    >
      <div className="mx-auto grid max-w-120 grid-cols-3 px-2 pt-1.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const unread = href === "/messaggi" && hasUnread;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative grid min-h-[52px] justify-items-center gap-[3px] rounded-xl py-2 text-xs font-medium text-soft transition-colors duration-300 hover:text-ink",
                active && "text-ink",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-[34%] -top-[7px] h-0.5 origin-center scale-x-0 rounded-full bg-accent transition-transform duration-500 ease-out-expo",
                  active && "scale-x-100",
                )}
              />
              <Icon className="size-6" strokeWidth={1.6} aria-hidden="true" />
              {label}
              {unread ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-[34%] size-2 rounded-full bg-accent"
                  />
                  <span className="sr-only">, ci sono messaggi non letti</span>
                </>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
