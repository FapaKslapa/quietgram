import { hashString } from "@/lib/hash";

export const WEAVE_VARIANTS = ["wave", "double", "arch", "hatch"] as const;

export type WeaveVariant = (typeof WEAVE_VARIANTS)[number];

export const pickWeave = (authorId: string): WeaveVariant =>
  WEAVE_VARIANTS[hashString(authorId) % WEAVE_VARIANTS.length] ?? "wave";
