"use client";

import { type ReactNode, useState } from "react";
import {
  CONVERSATION,
  NOW,
  PENDING_KEYS,
  POSTS,
  SAVED,
  SETTINGS,
  THREADS,
} from "@/app/dev/gallery/fixtures";
import type { GalleryViewName } from "@/app/dev/gallery/views";
import { LoginForm } from "@/components/login-form";
import { ConversationView } from "@/components/messaggi/conversation-view";
import { ThreadRows, ThreadsEmpty } from "@/components/messaggi/thread-states";
import { PairingToken } from "@/components/pairing-token";
import { FeedEmpty, FeedEnd, PostList } from "@/components/posta/feed-states";
import { type ModeSettings, ModeSheet } from "@/components/posta/mode-sheet";
import { PostaHeader } from "@/components/posta/posta-header";
import { PostaFeedSkeleton } from "@/components/posta/posta-screen";
import { RefreshPanel } from "@/components/posta/refresh-panel";
import { ProfiloScreen } from "@/components/profilo/profilo-screen";
import { RegisterDrawer } from "@/components/register-drawer";
import { SavedDrawer } from "@/components/salvati/saved-drawer";
import { SavedSkeleton } from "@/components/salvati/saved-skeleton";
import { SavedEmpty, SavedRefreshControl, SavedTiles } from "@/components/salvati/saved-states";
import { ScreenError } from "@/components/shell/screen-error";
import { ScreenHeader } from "@/components/shell/screen-header";
import { SessionExpiredView } from "@/components/shell/session-expired-view";
import { TabBarView } from "@/components/shell/tab-bar-view";
import { modeDefinition } from "@/lib/feed-modes";

const noop = () => undefined;
const sendNothing = async () => true;

type PostaFrameProps = {
  settings: ModeSettings;
  openModes: boolean;
  running?: boolean;
  empty?: boolean;
  loading?: boolean;
};

function PostaFrame({ settings: initial, openModes, running, empty, loading }: PostaFrameProps) {
  const [settings, setSettings] = useState(initial);
  const [open, setOpen] = useState(openModes);
  const mode = modeDefinition(settings.feedMode);

  return (
    <>
      <PostaHeader mode={mode} modesOpen={open} onOpenModes={() => setOpen(true)}>
        <RefreshPanel
          label="Aggiornato alle"
          last="14:21"
          next="Prossimo aggiornamento dalle 14:51"
          disabled
          progress={running ? { completed: 7, total: 18 } : null}
          onRefresh={noop}
        />
      </PostaHeader>
      {loading ? <PostaFeedSkeleton /> : null}
      {empty ? <FeedEmpty onOpenModes={() => setOpen(true)} /> : null}
      {loading || empty ? null : (
        <>
          <PostList posts={POSTS} now={NOW} />
          <FeedEnd variant={mode.weave} />
        </>
      )}
      <TabBarView pathname="/posta" unread />
      <ModeSheet
        open={open}
        onOpenChange={setOpen}
        settings={settings}
        onMode={(feedMode) => setSettings((current) => ({ ...current, feedMode }))}
        onThreshold={(creatorThreshold) =>
          setSettings((current) => ({ ...current, creatorThreshold }))
        }
        onRecency={(recencyDays) => setSettings((current) => ({ ...current, recencyDays }))}
        onAddException={noop}
        onRemoveException={noop}
      />
    </>
  );
}

function SavedFrame({
  openItem,
  empty,
  loading,
}: {
  openItem?: boolean;
  empty?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(openItem ?? false);

  return (
    <>
      <ScreenHeader title="Salvati" variant="arch" back={{ href: "/profilo", label: "Profilo" }}>
        <SavedRefreshControl pending={false} onRefresh={noop} />
      </ScreenHeader>
      {loading ? <SavedSkeleton /> : null}
      {empty ? <SavedEmpty /> : null}
      {loading || empty ? null : <SavedTiles items={SAVED} onOpen={() => setOpen(true)} />}
      <TabBarView pathname="/salvati" unread={false} />
      <SavedDrawer item={SAVED[1] ?? null} open={open} onOpenChange={setOpen} />
    </>
  );
}

function RegisterFrame() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <LoginForm />
      <RegisterDrawer
        open={open}
        onOpenChange={setOpen}
        pending={false}
        error="Il codice di registrazione non è valido."
        onSubmit={async () => undefined}
      />
    </>
  );
}

const render = (view: GalleryViewName): ReactNode => {
  switch (view) {
    case "posta":
      return <PostaFrame settings={SETTINGS} openModes={false} />;
    case "posta-running":
      return <PostaFrame settings={SETTINGS} openModes={false} running />;
    case "posta-empty":
      return <PostaFrame settings={SETTINGS} openModes={false} empty />;
    case "posta-loading":
      return <PostaFrame settings={SETTINGS} openModes={false} loading />;
    case "modes-friends":
      return <PostaFrame settings={SETTINGS} openModes />;
    case "modes-creators":
      return <PostaFrame settings={{ ...SETTINGS, feedMode: "creators" }} openModes />;
    case "expired":
      return <SessionExpiredView checking={false} failure={null} onRecheck={noop} />;
    case "expired-error":
      return <SessionExpiredView checking={false} failure="expired" onRecheck={noop} />;
    case "messaggi":
      return (
        <>
          <ScreenHeader title="Messaggi" variant="double" />
          <ThreadRows threads={THREADS} now={NOW} />
          <TabBarView pathname="/messaggi" unread />
        </>
      );
    case "messaggi-empty":
      return (
        <>
          <ScreenHeader title="Messaggi" variant="double" />
          <ThreadsEmpty />
          <TabBarView pathname="/messaggi" unread={false} />
        </>
      );
    case "thread":
      return (
        <ConversationView
          title="Giulia Rossi"
          state="ready"
          items={CONVERSATION}
          pendingKeys={PENDING_KEYS}
          sendEnabled
          onSend={sendNothing}
          onReload={noop}
        />
      );
    case "thread-failed":
      return (
        <ConversationView
          title="Giulia Rossi"
          state="failed"
          items={[]}
          pendingKeys={PENDING_KEYS}
          sendEnabled={false}
          onSend={sendNothing}
          onReload={noop}
        />
      );
    case "salvati":
      return <SavedFrame />;
    case "salvati-empty":
      return <SavedFrame empty />;
    case "salvati-open":
      return <SavedFrame openItem />;
    case "profilo":
      return (
        <>
          <ProfiloScreen />
          <TabBarView pathname="/profilo" unread={false} />
        </>
      );
    case "login":
      return <LoginForm />;
    case "register":
      return <RegisterFrame />;
    case "pair":
      return <PairingToken />;
    case "error":
      return <ScreenError title="Non riesco a caricare la posta" reset={noop} />;
  }
};

export function GalleryView({ view }: { view: GalleryViewName }) {
  return <div className="w-full flex-1 pb-28">{render(view)}</div>;
}
