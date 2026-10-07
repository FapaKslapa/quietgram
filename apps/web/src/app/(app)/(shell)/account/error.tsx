"use client";

import { ScreenError } from "@/components/shell/screen-error";

export default function AccountError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Non riesco a caricare il profilo" reset={reset} />;
}
