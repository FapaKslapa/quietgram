"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarInitials, avatarSource } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { mediaSrc } from "@/lib/media-proxy";

const SIZES = {
  sm: { root: "size-8", text: "text-[0.6875rem]" },
  md: { root: "size-11", text: "text-sm" },
  lg: { root: "size-14", text: "text-base" },
  xl: { root: "size-20", text: "text-2xl" },
} as const;

export type UserAvatarSize = keyof typeof SIZES;

type UserAvatarProps = {
  username: string;
  avatarUrl: string | null | undefined;
  size?: UserAvatarSize;
  className?: string | undefined;
};

export function UserAvatar({ username, avatarUrl, size = "sm", className }: UserAvatarProps) {
  const source = mediaSrc(avatarSource(avatarUrl));
  const { root, text } = SIZES[size];

  return (
    <Avatar aria-hidden="true" className={cn(root, className)}>
      {source ? <AvatarImage src={source} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className={cn("font-semibold", text)}>
        {avatarInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}
