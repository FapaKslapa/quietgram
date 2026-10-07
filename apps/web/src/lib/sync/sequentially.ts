export const sequentially = <T>(
  items: readonly T[],
  task: (item: T) => Promise<void>,
): Promise<void> =>
  items.reduce<Promise<void>>((chain, item) => chain.then(() => task(item)), Promise.resolve());
