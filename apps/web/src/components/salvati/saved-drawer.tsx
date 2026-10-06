"use client";

import { AuthorAvatar } from "@/components/posta/author-avatar";
import { PostCaption } from "@/components/posta/post-caption";
import { PostMedia } from "@/components/posta/post-media";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { SavedItem } from "@/lib/saved-grid";

type SavedDrawerProps = {
  item: SavedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SavedDrawer({ item, open, onOpenChange }: SavedDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {item ? (
          <div className="column min-h-0 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 px-4 pt-2 pb-3">
              <AuthorAvatar username={item.authorUsername} avatarUrl={null} />
              <div className="min-w-0 flex-1">
                <DrawerTitle className="truncate text-sm leading-tight font-semibold tracking-normal">
                  {item.authorUsername}
                </DrawerTitle>
                <DrawerDescription className="text-xs text-start">Post salvato</DrawerDescription>
              </div>
            </div>
            <PostMedia media={item.media} username={item.authorUsername} />
            {item.caption ? (
              <PostCaption username={item.authorUsername} caption={item.caption} />
            ) : null}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
