import { z } from "zod";

const idSchema = z.union([z.string(), z.number()]).transform(String);

export const userSchema = z
  .object({
    pk: idSchema,
    username: z.string(),
    profile_pic_url: z.string().nullish(),
  })
  .transform((user) => ({
    id: user.pk,
    username: user.username,
    avatarUrl: user.profile_pic_url ?? null,
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
  product_type: z.string().nullish(),
  taken_at: z.number(),
  user: z.object({ pk: idSchema, username: z.string() }),
  caption: z.object({ text: z.string() }).nullish(),
  carousel_media: z.array(mediaNodeSchema).nullish(),
});

export const userFeedPageSchema = z.compile(z.object({ items: z.array(mediaItemSchema) }));

export const savedPageSchema = z.compile(
  z.object({ items: z.array(z.object({ media: mediaItemSchema })) }),
);

export const timelinePageSchema = z.compile(
  z.object({ feed_items: z.array(z.object({ media_or_ad: mediaItemSchema.nullish() })) }),
);

export type MediaItem = z.output<typeof mediaItemSchema>;
export type MediaNode = z.output<typeof mediaNodeSchema>;
