"use client";

import { SAVED } from "@/app/dev/gallery/fixtures/saved";
import {
  linkedViewerRequest,
  noop,
  useOpenViewer,
  viewerRequest,
} from "@/app/dev/gallery/frames/shared";
import type { ViewMap } from "@/app/dev/gallery/frames/view-map";
import { useViewer } from "@/components/media/viewer-provider";
import { SavedSkeleton } from "@/components/salvati/saved-skeleton";
import { SavedEmpty, SavedRefreshControl, SavedTiles } from "@/components/salvati/saved-states";
import { ScreenHeader } from "@/components/shell/screen-header";
import { TabBarView } from "@/components/shell/tab-bar-view";

const OPEN_TARGET = SAVED[1];
const OPEN_REQUEST = OPEN_TARGET ? linkedViewerRequest(OPEN_TARGET) : null;

type SavedFrameProps = { openItem?: boolean; empty?: boolean; loading?: boolean };

function SavedFrame({ openItem = false, empty = false, loading = false }: SavedFrameProps) {
  const viewer = useViewer();
  useOpenViewer(openItem ? OPEN_REQUEST : null);

  return (
    <>
      <ScreenHeader title="Salvati" variant="arch" back={{ href: "/profilo", label: "Profilo" }}>
        <SavedRefreshControl pending={false} onRefresh={noop} />
      </ScreenHeader>
      {loading ? <SavedSkeleton /> : null}
      {empty ? <SavedEmpty /> : null}
      {loading || empty ? null : (
        <SavedTiles items={SAVED} onOpen={(item) => viewer.open(viewerRequest(item))} />
      )}
      <TabBarView pathname="/salvati" unread={false} />
    </>
  );
}

export const SAVED_VIEWS = {
  salvati: () => <SavedFrame />,
  "salvati-empty": () => <SavedFrame empty />,
  "salvati-open": () => <SavedFrame openItem />,
} satisfies ViewMap;
