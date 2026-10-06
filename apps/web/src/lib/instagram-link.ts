const BASE = "https://www.instagram.com";
const CODE_PATTERN = /^[\w-]{5,32}$/;
const REEL_PRODUCT_TYPE = "clips";

export const instagramUrl = (
  shortcode: string | null | undefined,
  productType: string | null | undefined,
): string | null => {
  if (!shortcode || !CODE_PATTERN.test(shortcode)) return null;
  const segment = productType === REEL_PRODUCT_TYPE ? "reel" : "p";
  return `${BASE}/${segment}/${shortcode}/`;
};
