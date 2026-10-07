"use client";

import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useViewer } from "@/components/media/viewer-provider";
import { SavedSkeleton } from "@/components/salvati/saved-skeleton";
import {
  SavedEmpty,
  SavedError,
  SavedRefreshControl,
  SavedTiles,
} from "@/components/salvati/saved-states";
import { useSavedSync } from "@/hooks/use-saved-sync";
import { instagramUrl } from "@/lib/instagram-link";
import { type SavedItem, shouldAutoSync } from "@/lib/saved-grid";
import { useTRPC } from "@/trpc/client";

export function SavedRefreshButton() {
  const trpc = useTRPC();
  const sync = useSavedSync();
  const pending = useIsMutating({ mutationKey: trpc.saved.sync.mutationKey() }) > 0;

  return <SavedRefreshControl pending={pending} onRefresh={() => sync.mutate()} />;
}

export function SavedGrid() {
  const trpc = useTRPC();
  const { data: items } = useSuspenseQuery(trpc.saved.list.queryOptions());
  const sync = useSavedSync();
  const tried = useRef(false);
  const viewer = useViewer();
  const empty = items.length === 0;

  useEffect(() => {
    if (!shouldAutoSync(items.length, tried.current)) return;
    tried.current = true;
    sync.mutate();
  }, [items.length, sync.mutate]);

  const openItem = (item: SavedItem) => {
    viewer.open({
      groupId: item.id,
      items: item.media,
      initialIndex: 0,
      username: item.authorUsername,
      caption: item.caption,
      instagramUrl: instagramUrl(item.shortcode, item.productType),
    });
  };

  if (empty && (sync.isIdle || sync.isPending)) return <SavedSkeleton />;

  if (empty && sync.isError) return <SavedError onRetry={() => sync.mutate()} />;

  if (empty) return <SavedEmpty />;

  return <SavedTiles items={items} onOpen={openItem} />;
}
