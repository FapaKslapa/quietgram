import type { Requester } from "#ig/request";
import { currentUserSchema, userInfoSchema } from "#ig/schemas";

export type UserCounts = { followerCount: number; isVerified: boolean; isBusiness: boolean };

export const fetchUserCounts = async (
  requester: Requester,
  userId: string,
): Promise<UserCounts> => {
  const { user } = userInfoSchema.parse(await requester.get(`/api/v1/users/${userId}/info/`));
  return {
    followerCount: user.follower_count,
    isVerified: user.is_verified ?? false,
    isBusiness: user.is_business ?? false,
  };
};

export const checkSession = async (requester: Requester): Promise<void> => {
  currentUserSchema.parse(await requester.get("/api/v1/accounts/current_user/", { edit: "true" }));
};
