import { z } from "zod";

const idSchema = z.union([z.string(), z.number()]).transform(String);

const userSchema = z.object({
  id: idSchema,
  username: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  avatar_url: z.string().nullish().catch(null),
  is_verified: z.boolean().nullish().catch(null),
  is_business: z.boolean().nullish().catch(null),
  follower_count: z.number().nullish().catch(null),
  latest_reel_media: z.number().nullish().catch(null),
});

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().min(1),
  width: z.number().nullish().catch(0),
  height: z.number().nullish().catch(0),
});

const mediaListSchema = z.array(z.unknown()).transform((items) =>
  items.flatMap((item) => {
    const parsed = mediaSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  }),
);

const postSchema = z.object({
  id: idSchema,
  code: z.string().nullish().catch(null),
  author_id: idSchema,
  author_username: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  caption: z.string().nullish().catch(null),
  taken_at_ms: z.number(),
  product_type: z.string().nullish().catch(null),
  media: mediaListSchema.nullish().transform((value) => value ?? []),
});

const threadSchema = z.object({
  id: idSchema,
  title: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  last_activity_at_ms: z.number(),
  unread: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  preview: z.string().nullish().catch(null),
});

const messageKindSchema = z.enum(["text", "photo", "video", "voice", "other"]);

const messageSchema = z.object({
  id: idSchema,
  sender_id: idSchema.nullish().catch(null),
  text: z.string().nullish().catch(null),
  kind: messageKindSchema.nullish().catch(null),
  sent_at_ms: z.number(),
});

export const sessionStatusSchema = z.compile(
  z.object({ active: z.boolean(), username: z.string().nullable() }),
);

export const usersResponseSchema = z.compile(z.object({ users: z.array(userSchema) }));
export const postsResponseSchema = z.compile(z.object({ posts: z.array(postSchema) }));
export const threadsResponseSchema = z.compile(z.object({ threads: z.array(threadSchema) }));
export const messagesResponseSchema = z.compile(z.object({ messages: z.array(messageSchema) }));
export const sentMessageSchema = z.compile(messageSchema);
export const timelineResponseSchema = z.compile(
  z.object({ posts: z.array(postSchema), next_cursor: z.string().nullish() }),
);

export const errorBodySchema = z.compile(
  z.object({
    code: z.string(),
    message: z.string().nullish(),
    retry_after_seconds: z.number().nullish(),
  }),
);

export type EnginePost = z.output<typeof postSchema>;
export type EngineUser = z.output<typeof userSchema>;
export type EngineMessage = z.output<typeof messageSchema>;
