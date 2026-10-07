export const overlapped = async <T>(
  items: readonly T[],
  fetchOne: (item: T) => Promise<() => Promise<void>>,
): Promise<void> => {
  const writes: Promise<void>[] = [];
  let failure: { error: unknown } | null = null;
  for (const item of items) {
    try {
      writes.push((await fetchOne(item))());
    } catch (error) {
      failure = { error };
      break;
    }
  }
  const settled = await Promise.allSettled(writes);
  if (failure) throw failure.error;
  const rejected = settled.find((result) => result.status === "rejected");
  if (rejected) throw rejected.reason;
};
