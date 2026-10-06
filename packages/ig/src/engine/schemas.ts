import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar_url: z.string().nullable(),
  is_verified: z.boolean(),
  is_business: z.boolean(),
  follower_count: z.number().nullable(),
});

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

const postSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  author_username: z.string(),
  caption: z.string().nullable(),
  taken_at_ms: z.number(),
  product_type: z.string(),
  media: z.array(mediaSchema),
});

const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  last_activity_at_ms: z.number(),
  unread: z.boolean(),
  preview: z.string().nullable(),
});

const messageSchema = z.object({
  id: z.string(),
  sender_id: z.string().nullable(),
  text: z.string().nullable(),
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
  z.object({ posts: z.array(postSchema), next_cursor: z.string().nullable() }),
);

export const errorBodySchema = z.compile(
  z.object({
    code: z.string(),
    message: z.string().nullish(),
    retry_after_seconds: z.number().nullish(),
  }),
);

export type EnginePost = z.output<typeof postSchema>;
