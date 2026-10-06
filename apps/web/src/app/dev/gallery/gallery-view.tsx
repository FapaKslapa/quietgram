"use client";

import { useMotionValue } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
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
import { useViewer, ViewerProvider } from "@/components/media/viewer-provider";
import { ConversationView } from "@/components/messaggi/conversation-view";
import { ThreadRows, ThreadsEmpty } from "@/components/messaggi/thread-states";
import { PairingToken } from "@/components/pairing-token";
import { BudgetLockView } from "@/components/posta/budget-lock-view";
import { FeedEmpty, FeedEnd, PostList } from "@/components/posta/feed-states";
import { type ModeSettings, ModeSheet } from "@/components/posta/mode-sheet";
import { PostaHeader } from "@/components/posta/posta-header";
import { PostaFeedSkeleton } from "@/components/posta/posta-screen";
import { PullSurface } from "@/components/posta/pull-surface";
import { RefreshPanel } from "@/components/posta/refresh-panel";
import { ChoiceSheet } from "@/components/profilo/choice-sheet";
import { ProfiloView } from "@/components/profilo/profilo-view";
import { RegisterDrawer } from "@/components/register-drawer";
import { SavedSkeleton } from "@/components/salvati/saved-skeleton";
import { SavedEmpty, SavedRefreshControl, SavedTiles } from "@/components/salvati/saved-states";
import { MediaTone } from "@/components/shell/media-tone";
import { ScreenError } from "@/components/shell/screen-error";
import { ScreenHeader } from "@/components/shell/screen-header";
import { SessionExpiredView } from "@/components/shell/session-expired-view";
import { TabBarView } from "@/components/shell/tab-bar-view";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { BUDGET_CHOICES } from "@/lib/budget";
import { modeDefinition } from "@/lib/feed-modes";
import { THEMES } from "@/lib/profile";
import { PULL_THRESHOLD, type PullPhase } from "@/lib/pull";

const noop = () => undefined;
const SAVED_TARGET = SAVED[1];
const POST_TARGET = POSTS[1];
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
  const viewer = useViewer();

  useEffect(() => {
    if (!openItem || !SAVED_TARGET) return;
    viewer.open({
      groupId: SAVED_TARGET.id,
      items: SAVED_TARGET.media,
      index: 0,
      username: SAVED_TARGET.authorUsername,
      caption: SAVED_TARGET.caption,
    });
  }, [openItem, viewer]);

  return (
    <>
      <ScreenHeader title="Salvati" variant="arch" back={{ href: "/profilo", label: "Profilo" }}>
        <SavedRefreshControl pending={false} onRefresh={noop} />
      </ScreenHeader>
      {loading ? <SavedSkeleton /> : null}
      {empty ? <SavedEmpty /> : null}
      {loading || empty ? null : (
        <SavedTiles
          items={SAVED}
          onOpen={(item) =>
            viewer.open({
              groupId: item.id,
              items: item.media,
              index: 0,
              username: item.authorUsername,
              caption: item.caption,
            })
          }
        />
      )}
      <TabBarView pathname="/salvati" unread={false} />
    </>
  );
}

function PullStatic({ distance, phase }: { distance: number; phase: PullPhase }) {
  const pull = useMotionValue(distance);
  const mode = modeDefinition("friends");

  return (
    <PullSurface
      pull={pull}
      phase={phase}
      nextLabel="Prossimo aggiornamento dalle 14:51"
      progress={null}
    >
      <PostaHeader mode={mode} modesOpen={false} onOpenModes={noop}>
        <RefreshPanel
          label="Aggiornato alle"
          last="14:21"
          next="Pronto per aggiornare"
          disabled={false}
          progress={null}
          onRefresh={noop}
        />
      </PostaHeader>
      <PostList posts={POSTS.slice(0, 1)} now={NOW} />
    </PullSurface>
  );
}

function PullLive() {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const mode = modeDefinition("friends");
  const { pull, phase } = usePullToRefresh({
    enabled: true,
    cooling: false,
    busy,
    onTrigger: () => {
      setBusy(true);
      setCount((current) => current + 1);
      setTimeout(() => setBusy(false), 2200);
    },
  });

  return (
    <PullSurface
      pull={pull}
      phase={phase}
      nextLabel="Prossimo aggiornamento dalle 14:51"
      progress={busy ? { completed: 7, total: 18 } : null}
    >
      <PostaHeader mode={mode} modesOpen={false} onOpenModes={noop}>
        <RefreshPanel
          label="Aggiornato alle"
          last="14:21"
          next="Pronto per aggiornare"
          disabled={busy}
          progress={busy ? { completed: 7, total: 18 } : null}
          onRefresh={() => setBusy(true)}
        />
      </PostaHeader>
      <p data-testid="pull-count" className="sr-only">
        {count}
      </p>
      <PostList posts={POSTS} now={NOW} />
    </PullSurface>
  );
}

function ViewerFrame() {
  const viewer = useViewer();

  useEffect(() => {
    if (!POST_TARGET) return;
    viewer.open({
      groupId: POST_TARGET.id,
      items: POST_TARGET.media,
      index: 1,
      username: POST_TARGET.authorUsername,
      caption: POST_TARGET.caption,
    });
  }, [viewer]);

  return <PostList posts={POSTS.slice(1, 2)} now={NOW} />;
}

function ProfiloFrame({ sheet }: { sheet?: "budget" | "theme" }) {
  const [grayscale, setGrayscale] = useState(false);
  const [open, setOpen] = useState<"budget" | "theme" | null>(sheet ?? null);
  const [budget, setBudget] = useState(15);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  return (
    <>
      <ProfiloView
        name="Stefano Marocco"
        sessionStatus="active"
        modeLabel={modeDefinition("friends").label}
        grayscale={grayscale}
        budgetLabel={budget === 0 ? "Spento" : `${budget} minuti`}
        themeLabel={THEMES.find((entry) => entry.value === theme)?.label ?? "Sistema"}
        loggingOut={false}
        onGrayscale={setGrayscale}
        onOpenFeed={noop}
        onOpenBudget={() => setOpen("budget")}
        onOpenTheme={() => setOpen("theme")}
        onLogout={noop}
      />
      <TabBarView pathname="/profilo" unread={false} />
      <ChoiceSheet
        open={open === "budget"}
        onOpenChange={(next) => setOpen(next ? "budget" : null)}
        title="Tempo di utilizzo"
        description="Dopo questo tempo in Posta, il feed si chiude per un'ora."
        name="session-budget"
        options={[
          { value: 0, label: "Spento", description: "Nessun limite." },
          ...BUDGET_CHOICES.map((minutes) => ({ value: minutes, label: `${minutes} minuti` })),
        ]}
        value={budget}
        onChange={setBudget}
      />
      <ChoiceSheet
        open={open === "theme"}
        onOpenChange={(next) => setOpen(next ? "theme" : null)}
        title="Tema"
        description="Scegli come appare l'app."
        name="theme"
        options={THEMES}
        value={theme}
        onChange={setTheme}
      />
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
    case "posta-grayscale":
      return (
        <>
          <MediaTone grayscale />
          <PostaFrame settings={SETTINGS} openModes={false} />
        </>
      );
    case "pull-pulling":
      return <PullStatic distance={40} phase="pulling" />;
    case "pull-armed":
      return <PullStatic distance={PULL_THRESHOLD + 12} phase="armed" />;
    case "pull-blocked":
      return <PullStatic distance={PULL_THRESHOLD + 12} phase="blocked" />;
    case "pull-live":
      return <PullLive />;
    case "carousel":
      return <PostList posts={POSTS.slice(1, 2)} now={NOW} />;
    case "viewer":
      return <ViewerFrame />;
    case "budget-lock":
      return <BudgetLockView minutes={15} reopensAt={NOW + 60 * 60_000} />;
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
      return <ProfiloFrame />;
    case "profilo-budget":
      return <ProfiloFrame sheet="budget" />;
    case "profilo-theme":
      return <ProfiloFrame sheet="theme" />;
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
  return (
    <ViewerProvider>
      <div className="w-full flex-1 pb-28">{render(view)}</div>
    </ViewerProvider>
  );
}
