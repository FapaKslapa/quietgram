import { Suspense } from "react";
import { ThreadList } from "@/components/messaggi/thread-list";
import { ThreadSkeleton } from "@/components/messaggi/thread-skeleton";
import { ScreenHeader } from "@/components/shell/screen-header";

export function MessaggiScreen() {
  return (
    <>
      <ScreenHeader title="Messaggi" variant="double" />
      <Suspense fallback={<ThreadSkeleton />}>
        <ThreadList />
      </Suspense>
    </>
  );
}
