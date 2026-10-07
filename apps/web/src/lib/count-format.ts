const THOUSAND = 1_000;
const TEN_THOUSAND = 10_000;
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

const decimal = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
};

const grouped = (value: number): string => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatCount = (value: number): string => {
  const count = Math.max(0, Math.floor(value));
  if (count < TEN_THOUSAND) return count < THOUSAND ? String(count) : grouped(count);
  if (count < MILLION) {
    const thousands = Math.round((count / THOUSAND) * 10) / 10;
    if (thousands >= THOUSAND) return `${decimal(thousands / THOUSAND)} mln`;
    return `${decimal(thousands)} k`;
  }
  if (count < BILLION) {
    const millions = Math.round((count / MILLION) * 10) / 10;
    if (millions >= THOUSAND) return `${decimal(millions / THOUSAND)} mld`;
    return `${decimal(millions)} mln`;
  }
  return `${decimal(count / BILLION)} mld`;
};
