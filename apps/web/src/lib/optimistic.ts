import {
  type FlagAction,
  type FlagOverride,
  optimisticOverride,
  type PostFlags,
  settleOverride,
} from "@/lib/interactions";

export type FlagSnapshot = { previous: FlagOverride | undefined };

export type FlagBinding = {
  server: () => PostFlags;
  override: () => FlagOverride | undefined;
  update: (change: (current: FlagOverride | undefined) => FlagOverride | undefined) => void;
  fail: () => void;
  settle: (action: FlagAction) => Promise<void> | void;
};

export const flagCallbacks = (binding: FlagBinding, action: FlagAction) => ({
  onMutate: (): FlagSnapshot => {
    const previous = binding.override();
    const next = optimisticOverride(binding.server(), previous, action);
    binding.update(() => next);
    return { previous };
  },
  onError: (_error: unknown, _variables: unknown, snapshot: FlagSnapshot | undefined) => {
    binding.update(() => snapshot?.previous);
    binding.fail();
  },
  onSuccess: (confirmed: PostFlags) => {
    binding.update((current) => settleOverride(binding.server(), current, confirmed));
  },
  onSettled: async () => {
    await binding.settle(action);
  },
});

export type CommentSnapshot = { id: string };

export type CommentBinding = {
  add: (text: string) => CommentSnapshot;
  remove: (id: string) => void;
  fail: () => void;
  refresh: () => Promise<void>;
};

export const commentCallbacks = (binding: CommentBinding) => ({
  onMutate: ({ text }: { text: string }): CommentSnapshot => binding.add(text),
  onError: (_error: unknown, _variables: unknown, snapshot: CommentSnapshot | undefined) => {
    if (snapshot) binding.remove(snapshot.id);
    binding.fail();
  },
  onSettled: async (
    _data: unknown,
    _error: unknown,
    _variables: unknown,
    snapshot: CommentSnapshot | undefined,
  ) => {
    await binding.refresh();
    if (snapshot) binding.remove(snapshot.id);
  },
});
