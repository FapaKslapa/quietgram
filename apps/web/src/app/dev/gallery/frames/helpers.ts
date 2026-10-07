import { useEffect } from "react";
import type { ViewerRequest } from "@/components/media/viewer-layer";
import { useViewer } from "@/components/media/viewer-provider";
import { instagramUrl } from "@/lib/instagram-link";
import type { PostMediaItem } from "@/lib/media";

export const noop = () => undefined;
export const sendNothing = async () => true;

export const NEXT_REFRESH_HINT = "Prossimo aggiornamento dalle 14:51";

type Showable = {
  id: string;
  media: PostMediaItem[];
  authorUsername: string;
  caption: string | null;
};

type Linkable = Showable & {
  shortcode?: string | null | undefined;
  productType?: string | null | undefined;
};

export const viewerRequest = (item: Showable, initialIndex = 0): ViewerRequest => ({
  groupId: item.id,
  items: item.media,
  initialIndex,
  username: item.authorUsername,
  caption: item.caption,
});

export const linkedViewerRequest = (item: Linkable, initialIndex = 0): ViewerRequest => ({
  ...viewerRequest(item, initialIndex),
  instagramUrl: instagramUrl(item.shortcode, item.productType),
});

export function useOpenViewer(request: ViewerRequest | null): void {
  const viewer = useViewer();

  useEffect(() => {
    if (request) viewer.open(request);
  }, [request, viewer]);
}
