import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { type CommentRow, dropComment, mergeServerComments, pendingComment } from "@/lib/comments";
import {
  type FlagAction,
  type FlagOverride,
  type PostFlags,
  resolveFlags,
  toggleAction,
} from "@/lib/interactions";
import { commentCallbacks, flagCallbacks } from "@/lib/optimistic";

const off: PostFlags = { liked: false, saved: false };

const flagWorld = (server: PostFlags) => {
  const state: { override: FlagOverride | undefined; failures: number; settled: FlagAction[] } = {
    override: undefined,
    failures: 0,
    settled: [],
  };
  const binding = {
    server: () => server,
    override: () => state.override,
    update: (change: (current: FlagOverride | undefined) => FlagOverride | undefined) => {
      state.override = change(state.override);
    },
    fail: () => {
      state.failures += 1;
    },
    settle: (action: FlagAction) => {
      state.settled.push(action);
    },
  };
  return { state, binding, flags: () => resolveFlags(server, state.override) };
};

const run = (
  callbacks: object,
  mutationFn: () => Promise<unknown>,
  variables: unknown = undefined,
): Promise<unknown> => {
  const observer = new MutationObserver<unknown, Error, unknown, unknown>(new QueryClient(), {
    ...callbacks,
    mutationFn,
  });
  return observer.mutate(variables).catch(() => undefined);
};

describe("optimistic like and save", () => {
  for (const kind of ["like", "save"] as const) {
    it(`shows the ${kind} immediately and rolls it back when the call fails`, async () => {
      const world = flagWorld(off);
      const action = toggleAction(world.flags(), kind);
      let seenDuringCall: PostFlags | null = null;
      await run(flagCallbacks(world.binding, action), async () => {
        seenDuringCall = world.flags();
        throw new Error("engine down");
      });
      expect(seenDuringCall).toEqual({ ...off, [kind === "like" ? "liked" : "saved"]: true });
      expect(world.flags()).toEqual(off);
      expect(world.state.failures).toBe(1);
      expect(world.state.settled).toEqual([action]);
    });

    it(`keeps the ${kind} when the call succeeds`, async () => {
      const world = flagWorld(off);
      const confirmed = { ...off, [kind === "like" ? "liked" : "saved"]: true };
      await run(flagCallbacks(world.binding, toggleAction(off, kind)), async () => confirmed);
      expect(world.flags()).toEqual(confirmed);
      expect(world.state.failures).toBe(0);
    });
  }

  it("restores the earlier optimistic value when a second action fails", async () => {
    const world = flagWorld(off);
    await run(flagCallbacks(world.binding, "like"), async () => ({ liked: true, saved: false }));
    expect(world.flags()).toEqual({ liked: true, saved: false });
    await run(flagCallbacks(world.binding, "save"), async () => {
      throw new Error("engine down");
    });
    expect(world.flags()).toEqual({ liked: true, saved: false });
  });
});

describe("optimistic comment", () => {
  const author = { userId: "me", username: "io", avatarUrl: null };

  const commentWorld = (server: CommentRow[]) => {
    const state: { pending: CommentRow[]; failures: number; refreshes: number } = {
      pending: [],
      failures: 0,
      refreshes: 0,
    };
    const binding = {
      add: (text: string) => {
        const row = pendingComment(author, text, 1, String(state.pending.length + 1));
        state.pending = [...state.pending, row];
        return { id: row.id };
      },
      remove: (id: string) => {
        state.pending = dropComment(state.pending, id);
      },
      fail: () => {
        state.failures += 1;
      },
      refresh: async () => {
        state.refreshes += 1;
      },
    };
    return { state, binding, rows: () => mergeServerComments(server, state.pending) };
  };

  it("shows the pending comment during the call and drops it when the call fails", async () => {
    const world = commentWorld([]);
    let during: string[] = [];
    await run(
      commentCallbacks(world.binding),
      async () => {
        during = world.rows().map((row) => row.text);
        throw new Error("rejected");
      },
      { text: " ciao " },
    );
    expect(during).toEqual(["ciao"]);
    expect(world.rows()).toEqual([]);
    expect(world.state.failures).toBe(1);
    expect(world.state.refreshes).toBe(1);
  });

  it("removes the pending row only after the list was refreshed on success", async () => {
    const world = commentWorld([]);
    await run(commentCallbacks(world.binding), async () => ({ ok: true }), { text: "ciao" });
    expect(world.state.pending).toEqual([]);
    expect(world.state.failures).toBe(0);
    expect(world.state.refreshes).toBe(1);
  });
});
