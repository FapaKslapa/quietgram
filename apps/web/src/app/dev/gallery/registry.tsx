import type { ReactNode } from "react";
import { ACCOUNT_VIEWS } from "@/app/dev/gallery/frames/account";
import { COMMENTS_VIEWS } from "@/app/dev/gallery/frames/comments";
import { MESSAGGI_VIEWS } from "@/app/dev/gallery/frames/messaggi";
import { POSTA_VIEWS } from "@/app/dev/gallery/frames/posta";
import { PROFILO_VIEWS } from "@/app/dev/gallery/frames/profilo";
import { PULL_VIEWS } from "@/app/dev/gallery/frames/pull";
import { SAVED_VIEWS } from "@/app/dev/gallery/frames/saved";
import { SESSION_VIEWS } from "@/app/dev/gallery/frames/session";
import { STORIES_VIEWS } from "@/app/dev/gallery/frames/stories";
import { VIEWER_VIEWS } from "@/app/dev/gallery/frames/viewer";
import type { GalleryViewName } from "@/app/dev/gallery/views";

const REGISTRY = {
  ...POSTA_VIEWS,
  ...STORIES_VIEWS,
  ...COMMENTS_VIEWS,
  ...ACCOUNT_VIEWS,
  ...SAVED_VIEWS,
  ...PULL_VIEWS,
  ...VIEWER_VIEWS,
  ...MESSAGGI_VIEWS,
  ...PROFILO_VIEWS,
  ...SESSION_VIEWS,
} satisfies Record<GalleryViewName, () => ReactNode>;

export const renderView = (view: GalleryViewName): ReactNode =>
  (REGISTRY satisfies Record<GalleryViewName, () => ReactNode>)[view]();
