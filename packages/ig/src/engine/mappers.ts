import type { IgMessage } from "#ig/direct";
import type {
  EngineComment,
  EngineMessage,
  EnginePost,
  EngineProfile,
  EngineStory,
  EngineTrayEntry,
  EngineUser,
} from "#ig/engine/schemas";
import type { IgUser } from "#ig/mutuals";
import { type IgPost, isReel } from "#ig/posts";
import type { IgComment, IgProfile, IgStory, IgTrayEntry } from "#ig/social";

export const toPost = (post: EnginePost): IgPost => ({
  id: post.id,
  code: post.code ?? null,
  productType: post.product_type ?? "feed",
  authorId: post.author_id,
  authorUsername: post.author_username,
  caption: post.caption ?? null,
  takenAt: post.taken_at_ms,
  media: post.media.map((item) => ({
    kind: item.kind,
    url: item.url,
    width: item.width ?? 0,
    height: item.height ?? 0,
  })),
});

export const toPosts = (posts: EnginePost[]): IgPost[] =>
  posts.filter((post) => !isReel(post)).map(toPost);

export const toUsers = (response: { users: EngineUser[] }): IgUser[] =>
  response.users.map((user) => ({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar_url ?? null,
    isVerified: user.is_verified ?? false,
    latestReelMedia: user.latest_reel_media ?? null,
  }));

export const toMessage = (message: EngineMessage): IgMessage => ({
  id: message.id,
  senderId: message.sender_id ?? "",
  type: message.text == null ? "other" : "text",
  kind: message.kind ?? (message.text ? "text" : "other"),
  text: message.text ?? null,
  sentAt: message.sent_at_ms,
});

export const toTrayEntry = (entry: EngineTrayEntry): IgTrayEntry => ({
  userId: entry.user_id,
  username: entry.username,
  avatarUrl: entry.avatar_url ?? null,
  latestReelMedia: entry.latest_reel_media ?? null,
  seen: entry.seen,
});

export const toStory = (story: EngineStory): IgStory => ({
  id: story.id,
  takenAt: story.taken_at_ms,
  expiresAt: story.expires_at_ms,
  media: {
    kind: story.media.kind,
    url: story.media.url,
    width: story.media.width ?? 0,
    height: story.media.height ?? 0,
  },
  productType: story.product_type ?? "story",
});

export const toProfile = (profile: EngineProfile): IgProfile => ({
  id: profile.id,
  username: profile.username,
  fullName: profile.full_name,
  biography: profile.biography,
  avatarUrl: profile.avatar_url ?? null,
  isPrivate: profile.is_private,
  isVerified: profile.is_verified,
  isBusiness: profile.is_business,
  followerCount: profile.follower_count,
  followingCount: profile.following_count,
  mediaCount: profile.media_count,
  externalUrl: profile.external_url ? profile.external_url : null,
  friendship: {
    following: profile.friendship.following,
    followedBy: profile.friendship.followed_by,
  },
});

export const toComment = (comment: EngineComment): IgComment => ({
  id: comment.id,
  userId: comment.user_id,
  username: comment.username,
  avatarUrl: comment.avatar_url ?? null,
  text: comment.text,
  createdAt: comment.created_at_ms,
  likeCount: comment.like_count,
  parentId: comment.parent_id ?? null,
});
