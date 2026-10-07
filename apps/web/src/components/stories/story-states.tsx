"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

type StoryHeaderProps = {
  username: string;
  avatarUrl: string | null;
  onClose: () => void;
  trailing?: ReactNode;
};

export function StoryHeader({ username, avatarUrl, onClose, trailing }: StoryHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 text-white">
      <UserAvatar username={username} avatarUrl={avatarUrl} />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{username}</p>
      {trailing}
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi"
        className="pointer-events-auto grid size-11 place-items-center rounded-full bg-white/12 backdrop-blur-sm"
      >
        <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}

export const STORY_TOP_INSET =
  "pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]";

export function StoryLoadingView({ username, avatarUrl, onClose }: StoryHeaderProps) {
  return (
    <div aria-busy="true" className="absolute inset-0 bg-black text-white">
      <div className={`grid gap-3 ${STORY_TOP_INSET}`}>
        <div aria-hidden="true" className="h-0.5 overflow-hidden rounded-full bg-white/30">
          <span className="block h-full w-1/3 rounded-full bg-white/80 motion-safe:animate-[story-sweep_1.1s_ease-in-out_infinite]" />
        </div>
        <StoryHeader username={username} avatarUrl={avatarUrl} onClose={onClose} />
      </div>
      <div className="absolute inset-0 grid place-content-center justify-items-center gap-4">
        <UserAvatar
          username={username}
          avatarUrl={avatarUrl}
          size="xl"
          className="size-24 motion-safe:animate-pulse"
        />
        <p role="status" className="text-sm text-white/70">
          Carico le storie
        </p>
      </div>
    </div>
  );
}

type StoryErrorViewProps = StoryHeaderProps & {
  message: string;
  onRetry: () => void;
  onSkip?: (() => void) | undefined;
};

export function StoryErrorView({
  username,
  avatarUrl,
  message,
  onRetry,
  onSkip,
  onClose,
}: StoryErrorViewProps) {
  return (
    <div className="absolute inset-0 bg-black text-white">
      <div className={`grid gap-3 ${STORY_TOP_INSET}`}>
        <StoryHeader username={username} avatarUrl={avatarUrl} onClose={onClose} />
      </div>
      <div
        role="alert"
        className="absolute inset-0 grid place-content-center justify-items-center gap-4 px-8 text-center"
      >
        <p className="text-sm text-white/80">{message}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="pointer-events-auto border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Riprova
          </Button>
          {onSkip ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              className="pointer-events-auto text-white/80 hover:bg-white/10 hover:text-white"
            >
              Avanti
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
