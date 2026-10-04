import type { Requester } from "#ig/request";
import { type IgUser, usersPageSchema } from "#ig/schemas";

export type { IgUser };

export const computeMutuals = (following: IgUser[], followers: IgUser[]): IgUser[] => {
  const followerIds = new Set(followers.map((follower) => follower.id));
  return following.filter((user) => followerIds.has(user.id));
};

export const fetchAllUsers = async (
  requester: Requester,
  kind: "following" | "followers",
  userId: string,
): Promise<IgUser[]> => {
  const users: IgUser[] = [];
  let cursor: string | null | undefined;
  do {
    const params: Record<string, string> = { count: "200" };
    if (cursor) params.max_id = cursor;
    const page = usersPageSchema.parse(
      await requester.get(`/api/v1/friendships/${userId}/${kind}/`, params),
    );
    users.push(...page.users);
    cursor = page.next_max_id;
  } while (cursor);
  return users;
};
