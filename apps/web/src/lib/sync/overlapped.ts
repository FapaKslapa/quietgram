import { sequentially } from "@/lib/sync/sequentially";

type Outcome = { error: unknown } | null;

const capture = (task: Promise<void>): Promise<Outcome> =>
  task.then(
    () => null,
    (error: unknown) => ({ error }),
  );

export const overlapped = async <T>(
  items: readonly T[],
  fetchOne: (item: T) => Promise<() => Promise<void>>,
): Promise<void> => {
  let writing: Promise<Outcome> = Promise.resolve(null);
  const fetching = capture(
    sequentially(items, async (item) => {
      const write = await fetchOne(item);
      const previous = writing;
      writing = Promise.all([previous, capture(write())]).then(
        ([earlier, later]) => earlier ?? later,
      );
    }),
  );
  const failure = await fetching.then(async (fetched) => {
    const written = await writing;
    return fetched ?? written;
  });
  if (failure) throw failure.error;
};
