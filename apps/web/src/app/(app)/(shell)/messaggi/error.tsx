"use client";

import { ScreenError } from "@/components/shell/screen-error";

export default function MessaggiError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Non riesco a caricare i messaggi" reset={reset} />;
}
