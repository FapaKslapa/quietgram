"use client";

import type { ReactNode } from "react";
import { CONVERSATION, PENDING_KEYS } from "@/app/dev/gallery/fixtures/conversation";
import { LONG_THREADS, LONG_TITLE, THREADS } from "@/app/dev/gallery/fixtures/threads";
import { NOW } from "@/app/dev/gallery/fixtures/time";
import { noop, sendNothing } from "@/app/dev/gallery/frames/shared";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { ConversationView } from "@/components/messaggi/conversation-view";
import type { ThreadSummary } from "@/components/messaggi/thread-row";
import { ThreadRows, ThreadsEmpty } from "@/components/messaggi/thread-states";
import { ScreenHeader } from "@/components/shell/screen-header";
import { TabBarView } from "@/components/shell/tab-bar-view";

function InboxFrame({ unread, children }: { unread: boolean; children: ReactNode }) {
  return (
    <>
      <ScreenHeader title="Messaggi" variant="double" />
      {children}
      <TabBarView pathname="/messaggi" unread={unread} />
    </>
  );
}

const inbox = (threads: ThreadSummary[]) => (
  <InboxFrame unread>
    <ThreadRows threads={threads} now={NOW} />
  </InboxFrame>
);

type ThreadFrameProps = {
  title?: string;
  state?: "ready" | "failed";
  sendEnabled?: boolean;
  stale?: boolean;
};

function ThreadFrame({
  title = "Giulia Rossi",
  state = "ready",
  sendEnabled = true,
  stale = false,
}: ThreadFrameProps) {
  return (
    <ConversationView
      title={title}
      state={state}
      items={state === "ready" ? CONVERSATION : []}
      pendingKeys={PENDING_KEYS}
      sendEnabled={sendEnabled}
      onSend={sendNothing}
      onReload={noop}
      onBack={noop}
      stale={stale}
    />
  );
}

export const MESSAGGI_VIEWS = {
  messaggi: () => inbox(THREADS),
  "messaggi-long": () => inbox(LONG_THREADS),
  "messaggi-empty": () => (
    <InboxFrame unread={false}>
      <ThreadsEmpty />
    </InboxFrame>
  ),
  thread: () => <ThreadFrame />,
  "thread-off": () => <ThreadFrame sendEnabled={false} />,
  "thread-stale": () => <ThreadFrame title={LONG_TITLE} stale />,
  "thread-failed": () => <ThreadFrame state="failed" sendEnabled={false} />,
} satisfies ViewMap;
