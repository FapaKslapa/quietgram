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
