import type { Requester } from "./request";
import {
  type IgUser,
  type MediaItem,
  type MediaNode,
  savedPageSchema,
  timelinePageSchema,
  userFeedPageSchema,
} from "./schemas";

export type IgMedia = { kind: "image" | "video"; url: string; width: number; height: number };

export type IgPost = {
  id: string;
  authorId: string;
  authorUsername: string;
  caption: string | null;
  takenAt: number;
  media: IgMedia[];
};

export const isReel = (item: { product_type?: string | null | undefined }): boolean =>
  item.product_type === "clips";

const toMedia = (node: MediaNode): IgMedia[] => {
  const video = node.video_versions?.[0];
  if (video) return [{ kind: "video", ...video }];
  const image = node.image_versions2?.candidates[0];
  return image ? [{ kind: "image", ...image }] : [];
};

const toPost = (item: MediaItem): IgPost => ({
  id: item.pk,
  authorId: item.user.pk,
  authorUsername: item.user.username,
  caption: item.caption?.text ?? null,
  takenAt: item.taken_at * 1000,
  media: (item.carousel_media ?? [item]).flatMap(toMedia),
});

const toPosts = (items: MediaItem[]): IgPost[] => items.filter((item) => !isReel(item)).map(toPost);

export const fetchUserPosts = async (requester: Requester, user: IgUser): Promise<IgPost[]> => {
  const page = userFeedPageSchema.parse(await requester.get(`/api/v1/feed/user/${user.id}/`));
  return toPosts(page.items);
};

export const fetchSaved = async (requester: Requester): Promise<IgPost[]> => {
  const page = savedPageSchema.parse(await requester.get("/api/v1/feed/saved/posts/"));
  return toPosts(page.items.map((entry) => entry.media));
};

export const fetchTimeline = async (
  requester: Requester,
  isAllowedAuthor: (authorId: string) => boolean,
): Promise<IgPost[]> => {
  const page = timelinePageSchema.parse(await requester.get("/api/v1/feed/timeline/"));
  const items = page.feed_items.flatMap((entry) => (entry.media_or_ad ? [entry.media_or_ad] : []));
  return toPosts(items.filter((item) => isAllowedAuthor(item.user.pk)));
};
