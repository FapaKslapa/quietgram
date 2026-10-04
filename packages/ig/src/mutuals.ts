import type { Requester } from "#ig/request";
import { type IgUser, usersPageSchema } from "#ig/schemas";

export type { IgUser };

export const computeMutuals = (following: IgUser[], followers: IgUser[]): IgUser[] => {
  const followerIds = new Set(followers.map((follower) => follower.id));
  return following.filter((user) => followerIds.has(user.id));
};

export type UsersPage = { users: IgUser[]; nextCursor: string | null };

export const fetchUsersPage = async (
  requester: Requester,
  kind: "following" | "followers",
  userId: string,
  cursor?: string | null,
): Promise<UsersPage> => {
  const params: Record<string, string> = { count: "200" };
  if (cursor) params.max_id = cursor;
  const page = usersPageSchema.parse(
    await requester.get(`/api/v1/friendships/${userId}/${kind}/`, params),
  );
  return { users: page.users, nextCursor: page.next_max_id ?? null };
};

export const fetchAllUsers = async (
  requester: Requester,
  kind: "following" | "followers",
  userId: string,
): Promise<IgUser[]> => {
  const users: IgUser[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchUsersPage(requester, kind, userId, cursor);
    users.push(...page.users);
    cursor = page.nextCursor;
  } while (cursor);
  return users;
};
