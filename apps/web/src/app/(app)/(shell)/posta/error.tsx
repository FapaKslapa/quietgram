"use client";

import { ScreenError } from "@/components/shell/screen-error";

export default function PostaError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Non riesco a caricare la posta" reset={reset} />;
}
