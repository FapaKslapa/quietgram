"use client";

import { useState } from "react";
import { initialsOf } from "@/lib/author";
import { cn } from "@/lib/utils";

type AuthorAvatarProps = {
  username: string;
  avatarUrl: string | null;
  className?: string;
};

export function AuthorAvatar({ username, avatarUrl, className }: AuthorAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = avatarUrl !== null && avatarUrl !== failedUrl;

  return (
    <span
      className={cn(
        "grid size-8 flex-none place-items-center overflow-hidden rounded-full bg-muted text-[0.6875rem] font-semibold text-muted-foreground",
        className,
      )}
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
