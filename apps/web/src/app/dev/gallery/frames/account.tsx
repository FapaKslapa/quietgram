"use client";

import { ACCOUNT, ACCOUNT_POSTS } from "@/app/dev/gallery/fixtures/account";
import { useOpenViewer, viewerRequest } from "@/app/dev/gallery/frames/shared";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { AccountHeader } from "@/components/account/account-header";
import {
  AccountHeaderSkeleton,
  AccountPostsEmpty,
  AccountPostsSkeleton,
} from "@/components/account/account-states";
import { useViewer } from "@/components/media/viewer-provider";
import { SavedTiles } from "@/components/salvati/saved-states";
import { ScreenHeader } from "@/components/shell/screen-header";
import { TabBarView } from "@/components/shell/tab-bar-view";
import { mergeTiles, tileLabel } from "@/lib/account";

type AccountState = "ready" | "loading" | "empty" | "private";

const TILES = mergeTiles([ACCOUNT_POSTS]);
const OPEN_TARGET = TILES[1];
const OPEN_REQUEST = OPEN_TARGET ? viewerRequest(OPEN_TARGET) : null;

function AccountFrame({ state, openPost = false }: { state: AccountState; openPost?: boolean }) {
  const viewer = useViewer();
  useOpenViewer(openPost ? OPEN_REQUEST : null);

  const profile = state === "private" ? { ...ACCOUNT, isPrivate: true } : ACCOUNT;

  return (
    <>
      <ScreenHeader title="giulia.r" variant="arch" back={{ href: "/posta", label: "Posta" }} />
      {state === "loading" ? (
        <>
          <AccountHeaderSkeleton />
          <AccountPostsSkeleton />
        </>
      ) : (
        <AccountHeader profile={profile} />
      )}
      {state === "empty" || state === "private" ? (
        <AccountPostsEmpty isPrivate={state === "private"} />
      ) : null}
      {state === "ready" ? (
        <SavedTiles
          items={TILES}
          labelOf={tileLabel}
          onOpen={(item) => viewer.open(viewerRequest(item))}
        />
      ) : null}
      <TabBarView pathname="/account/1" unread={false} />
    </>
  );
}

export const ACCOUNT_VIEWS = {
  account: () => <AccountFrame state="ready" />,
  "account-loading": () => <AccountFrame state="loading" />,
  "account-empty": () => <AccountFrame state="empty" />,
  "account-private": () => <AccountFrame state="private" />,
  "account-open": () => <AccountFrame state="ready" openPost />,
} satisfies ViewMap;
