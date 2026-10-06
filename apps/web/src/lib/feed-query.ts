type FeedCursor = { takenAt: number; id: string };

export const nextCursorOf = (page: { nextCursor: FeedCursor | null }): FeedCursor | undefined =>
  page.nextCursor ?? undefined;
