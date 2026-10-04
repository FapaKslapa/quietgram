const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const hashString = (value: string): number => {
  let hash = FNV_OFFSET;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
};
