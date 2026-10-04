const D1_MAX_BOUND_PARAMS = 100;

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const chunkRows = <T>(rows: readonly T[], columns: number): T[][] =>
  chunk(rows, Math.max(1, Math.floor(D1_MAX_BOUND_PARAMS / columns)));
