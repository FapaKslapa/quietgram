import { describe, expect, it } from "vitest";
import {
  appendComment,
  type CommentRow,
  canPostComment,
  dropComment,
  isOwnComment,
  isPendingComment,
  MAX_COMMENT_LENGTH,
  mergeServerComments,
  pendingComment,
  remainingComment,
  showCommentCounter,
  threadComments,
  validateComment,
} from "@/lib/comments";

const row = (id: string, parentId: string | null = null, userId = "u1"): CommentRow => ({
  id,
  userId,
  username: "anna",
  avatarUrl: null,
  text: id,
  createdAt: 1,
  likeCount: 0,
  parentId,
});

describe("validateComment", () => {
  it("accepts 1 to 2200 trimmed characters", () => {
    expect(validateComment("")).toBe("empty");
    expect(validateComment("   \n ")).toBe("empty");
    expect(validateComment("a")).toBe("ok");
    expect(validateComment("a".repeat(MAX_COMMENT_LENGTH))).toBe("ok");
    expect(validateComment("a".repeat(MAX_COMMENT_LENGTH + 1))).toBe("too_long");
  });

  it("requires interactions to be enabled to post", () => {
    expect(canPostComment("ciao", true)).toBe(true);
    expect(canPostComment("ciao", false)).toBe(false);
    expect(canPostComment(" ", true)).toBe(false);
  });

  it("counts remaining characters and shows the counter near the limit", () => {
    expect(remainingComment("abc")).toBe(MAX_COMMENT_LENGTH - 3);
    expect(showCommentCounter("a".repeat(1999))).toBe(false);
    expect(showCommentCounter("a".repeat(2000))).toBe(true);
  });
});

describe("threadComments", () => {
  it("nests replies one level under their parent keeping order", () => {
    const nodes = threadComments([row("1"), row("2"), row("3", "1"), row("4", "1"), row("5", "2")]);
    expect(nodes.map((node) => node.comment.id)).toEqual(["1", "2"]);
    expect(nodes[0]?.replies.map((reply) => reply.id)).toEqual(["3", "4"]);
    expect(nodes[1]?.replies.map((reply) => reply.id)).toEqual(["5"]);
  });

  it("treats a reply to an unknown parent as a root", () => {
    const nodes = threadComments([row("1"), row("9", "404")]);
    expect(nodes.map((node) => node.comment.id)).toEqual(["1", "9"]);
  });
});

describe("optimistic comments", () => {
  const author = { userId: "me", username: "io", avatarUrl: null };

  it("appends a pending comment and rolls it back", () => {
    const pending = pendingComment(author, "  ciao  ", 10, "k1");
    expect(pending.text).toBe("ciao");
    expect(isPendingComment(pending)).toBe(true);
    const list = appendComment([row("1")], pending);
    expect(list.map((entry) => entry.id)).toEqual(["1", pending.id]);
    expect(dropComment(list, pending.id).map((entry) => entry.id)).toEqual(["1"]);
  });

  it("drops replies together with a deleted parent", () => {
    expect(dropComment([row("1"), row("2", "1"), row("3")], "1").map((entry) => entry.id)).toEqual([
      "3",
    ]);
  });

  it("keeps pending comments across a server refresh", () => {
    const pending = pendingComment(author, "ciao", 10, "k1");
    const merged = mergeServerComments([row("1"), row("2")], [row("1"), pending]);
    expect(merged.map((entry) => entry.id)).toEqual(["1", "2", pending.id]);
  });

  it("recognises own comments", () => {
    expect(isOwnComment(row("1", null, "me"), "me")).toBe(true);
    expect(isOwnComment(row("1", null, "x"), "me")).toBe(false);
    expect(isOwnComment(row("1", null, "me"), null)).toBe(false);
  });
});
