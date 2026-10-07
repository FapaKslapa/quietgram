import { NEXT_REFRESH_HINT, noop } from "@/app/dev/gallery/frames/helpers";
import { PostaHeader } from "@/components/posta/posta-header";
import { RefreshPanel } from "@/components/posta/refresh-panel";
import type { RefreshProgress } from "@/hooks/use-refresh";
import { type FeedMode, modeDefinition } from "@/lib/feed-modes";

type RefreshHeaderProps = {
  hint?: string | null;
  note?: string | null;
  disabled?: boolean;
  progress?: RefreshProgress | null;
  mode?: FeedMode;
  modesOpen?: boolean;
  onOpenModes?: () => void;
  onRefresh?: () => void;
};

export function RefreshHeader({
  hint = NEXT_REFRESH_HINT,
  note = null,
  disabled = true,
  progress = null,
  mode = "friends",
  modesOpen = false,
  onOpenModes = noop,
  onRefresh = noop,
}: RefreshHeaderProps) {
  return (
    <PostaHeader mode={modeDefinition(mode)} modesOpen={modesOpen} onOpenModes={onOpenModes}>
      <RefreshPanel
        hint={hint}
        note={note}
        disabled={disabled}
        progress={progress}
        onRefresh={onRefresh}
      />
    </PostaHeader>
  );
}
