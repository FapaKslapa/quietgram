export const nextCursorOf = (page: { nextCursor: number | null }): number | undefined =>
  page.nextCursor ?? undefined;
