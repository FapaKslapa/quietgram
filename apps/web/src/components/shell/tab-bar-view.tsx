"use client";

import { Mail, MessageSquare, User } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/posta", label: "Posta", Icon: Mail, also: [] },
  { href: "/messaggi", label: "Messaggi", Icon: MessageSquare, also: [] },
  { href: "/profilo", label: "Profilo", Icon: User, also: ["/salvati"] },
] as const;

const matches = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

type TabBarViewProps = { pathname: string; unread: boolean };

export function TabBarView({ pathname, unread }: TabBarViewProps) {
  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="column flex items-stretch rounded-full border bg-card">
        {TABS.map(({ href, label, Icon, also }) => {
          const active = [href, ...also].some((target) => matches(pathname, target));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-1 items-center justify-center rounded-full py-1.5 transition-colors active:scale-95",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative isolate flex flex-col items-center gap-1 rounded-full px-3.5 py-1.5",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="tab-indicator"
                    aria-hidden="true"
                    transition={{ type: "spring", stiffness: 520, damping: 42 }}
                    className="absolute inset-0 -z-10 rounded-full bg-accent"
                  />
                ) : null}
                <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-[11px] leading-none font-semibold">{label}</span>
                {href === "/messaggi" && unread ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-2 size-1.5 rounded-full bg-foreground"
                    />
                    <span className="sr-only">, ci sono messaggi non letti</span>
                  </>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
