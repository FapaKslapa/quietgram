export const pairedLabel = (timestamp: number, timeZone?: string): string => {
  const date = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(timestamp));
  return `Collegata il ${date}`;
};
