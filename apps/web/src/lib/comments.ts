export const MAX_COMMENT_LENGTH = 2_200;
export const COMMENT_COUNTER_THRESHOLD = 2_000;

export type CommentRow = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  text: string;
  createdAt: number;
  likeCount: number;
  parentId: string | null;
};

export type CommentNode = { comment: CommentRow; replies: CommentRow[] };

export const validateComment = (text: string): "empty" | "too_long" | "ok" => {
  const length = text.trim().length;
  if (length === 0) return "empty";
  return length > MAX_COMMENT_LENGTH ? "too_long" : "ok";
};

export const canPostComment = (text: string, enabled: boolean): boolean =>
  enabled && validateComment(text) === "ok";

export const remainingComment = (text: string): number => MAX_COMMENT_LENGTH - text.trim().length;

export const showCommentCounter = (text: string): boolean =>
  text.trim().length >= COMMENT_COUNTER_THRESHOLD;

export const threadComments = (rows: readonly CommentRow[]): CommentNode[] => {
  const ids = new Set(rows.map((row) => row.id));
  const repliesOf = new Map<string, CommentRow[]>();
  const roots: CommentRow[] = [];
  for (const row of rows) {
    if (row.parentId !== null && ids.has(row.parentId)) {
      const list = repliesOf.get(row.parentId) ?? [];
      list.push(row);
      repliesOf.set(row.parentId, list);
    } else {
      roots.push(row);
    }
  }
  return roots.map((comment) => ({ comment, replies: repliesOf.get(comment.id) ?? [] }));
};

const PENDING_PREFIX = "pending-";

export const isPendingComment = (row: Pick<CommentRow, "id">): boolean =>
  row.id.startsWith(PENDING_PREFIX);

export const pendingComment = (
  author: { userId: string; username: string; avatarUrl: string | null },
  text: string,
  now: number,
  key: string,
): CommentRow => ({
  id: `${PENDING_PREFIX}${key}`,
  userId: author.userId,
  username: author.username,
  avatarUrl: author.avatarUrl,
  text: text.trim(),
  createdAt: now,
  likeCount: 0,
  parentId: null,
});

export const appendComment = (rows: readonly CommentRow[], row: CommentRow): CommentRow[] => [
  ...rows,
  row,
];

export const dropComment = (rows: readonly CommentRow[], id: string): CommentRow[] =>
  rows.filter((row) => row.id !== id && row.parentId !== id);

export const mergeServerComments = (
  server: readonly CommentRow[],
  current: readonly CommentRow[],
): CommentRow[] => [...server, ...current.filter(isPendingComment)];

export const isOwnComment = (row: Pick<CommentRow, "userId">, viewerId: string | null): boolean =>
  viewerId !== null && row.userId === viewerId;
