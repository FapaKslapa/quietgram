import { z } from "zod";

const idSchema = z.union([z.string(), z.number()]).transform(String);

export const userSchema = z
  .object({
    pk: idSchema,
    username: z.string(),
    profile_pic_url: z.string().nullish(),
    is_verified: z.boolean().nullish(),
    latest_reel_media: z.number().nullish(),
  })
  .transform((user) => ({
    id: user.pk,
    username: user.username,
    avatarUrl: user.profile_pic_url ?? null,
    isVerified: user.is_verified ?? false,
    latestReelMedia: user.latest_reel_media ?? null,
  }));

export const usersPageSchema = z.compile(
  z.object({
    users: z.array(userSchema),
    next_max_id: z.string().nullish(),
  }),
);

export type IgUser = z.output<typeof userSchema>;

const sourceSchema = z.object({ url: z.string(), width: z.number(), height: z.number() });

const mediaNodeSchema = z.object({
  image_versions2: z.object({ candidates: z.array(sourceSchema) }).nullish(),
  video_versions: z.array(sourceSchema).nullish(),
});

export const mediaItemSchema = mediaNodeSchema.extend({
  pk: idSchema,
  code: z.string().nullish(),
  product_type: z.string().nullish(),
  taken_at: z.number(),
  user: z.object({ pk: idSchema, username: z.string() }),
  caption: z.object({ text: z.string() }).nullish(),
  carousel_media: z.array(mediaNodeSchema).nullish(),
});

export const savedPageSchema = z.compile(
  z.object({
    items: z.array(z.object({ media: mediaItemSchema })),
    next_max_id: z.string().nullish(),
    more_available: z.boolean().nullish(),
  }),
);

export const timelinePageSchema = z.compile(
  z.object({
    feed_items: z.array(z.object({ media_or_ad: mediaItemSchema.nullish() })),
    next_max_id: z.string().nullish(),
  }),
);

export type MediaItem = z.output<typeof mediaItemSchema>;
export type MediaNode = z.output<typeof mediaNodeSchema>;

export const inboxPageSchema = z.compile(
  z.object({
    inbox: z.object({
      threads: z.array(
        z.object({
          thread_id: idSchema,
          thread_title: z.string().nullish(),
          last_activity_at: z.number(),
          read_state: z.number().nullish(),
        }),
      ),
    }),
  }),
);

export const threadPageSchema = z.compile(
  z.object({
    thread: z.object({
      items: z.array(
        z.object({
          item_id: idSchema,
          user_id: idSchema,
          timestamp: z.number(),
          item_type: z.string(),
          text: z.string().nullish(),
        }),
      ),
    }),
  }),
);

export const sendResponseSchema = z.compile(z.object({ status: z.literal("ok") }));

export const userInfoSchema = z.compile(
  z.object({
    user: z.object({
      follower_count: z.number(),
      is_verified: z.boolean().nullish(),
      is_business: z.boolean().nullish(),
    }),
  }),
);

export const currentUserSchema = z.compile(z.object({ status: z.literal("ok") }));
