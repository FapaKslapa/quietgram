import { Bookmark, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ScreenHeader } from "@/components/shell/screen-header";

export function ProfiloScreen() {
  return (
    <>
      <ScreenHeader title="Profilo" variant="hatch" />
      <nav aria-label="Profilo" className="column px-4">
        <ul className="grid divide-y border-y">
          <li>
            <Link
              href="/salvati"
              className="flex min-h-14 items-center gap-3 px-1 transition-colors hover:bg-accent"
            >
              <Bookmark className="size-5 flex-none" strokeWidth={1.8} aria-hidden="true" />
              <span className="flex-1 font-semibold">Salvati</span>
              <ChevronRight
                className="size-5 flex-none text-muted-foreground"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
