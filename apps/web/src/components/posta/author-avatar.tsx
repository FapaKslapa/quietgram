"use client";

import { useState } from "react";
import { avatarColor, initialsOf } from "@/lib/author";
import { cn } from "@/lib/utils";

type AuthorAvatarProps = {
  authorId: string;
  username: string;
  avatarUrl: string | null;
  className?: string;
};

export function AuthorAvatar({ authorId, username, avatarUrl, className }: AuthorAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = avatarUrl !== null && avatarUrl !== failedUrl;

  return (
    <span
      className={cn(
        "grid size-10 flex-none place-items-center overflow-hidden rounded-full text-[0.8125rem] font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: avatarColor(authorId) }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        initialsOf(username)
      )}
    </span>
  );
}
