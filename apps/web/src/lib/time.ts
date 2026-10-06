export const APP_TIME_ZONE = "Europe/Rome";

const MONTHS = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];
const WEEKDAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

type Zoned = { year: number; month: number; day: number; hour: number; minute: number };

const zoned = (timestamp: number): Zoned => {
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(timestamp))) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  };
};

const pad = (value: number): string => String(value).padStart(2, "0");

const dayNumber = ({ year, month, day }: Zoned): number => Date.UTC(year, month - 1, day) / DAY_MS;

const clock = ({ hour, minute }: Zoned): string => `${pad(hour)}:${pad(minute)}`;

export const formatClock = (timestamp: number): string => clock(zoned(timestamp));

export const formatRelativeTime = (timestamp: number, now: number): string => {
  if (now - timestamp < MINUTE_MS && now >= timestamp) return "adesso";
  const then = zoned(timestamp);
  const current = zoned(now);
  const daysAgo = dayNumber(current) - dayNumber(then);
  if (daysAgo <= 0) return `oggi ${clock(then)}`;
  if (daysAgo === 1) return `ieri ${clock(then)}`;
  if (daysAgo < 7) {
    const weekday = WEEKDAYS[new Date(Date.UTC(then.year, then.month - 1, then.day)).getUTCDay()];
    return `${weekday} ${clock(then)}`;
  }
  const month = (MONTHS[then.month - 1] ?? "").toLowerCase();
  const base = `${then.day} ${month}`;
  return then.year === current.year ? base : `${base} ${then.year}`;
};

const FULL_WEEKDAYS = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];

export const dayKey = (timestamp: number): string => {
  const { year, month, day } = zoned(timestamp);
  return `${year}-${pad(month)}-${pad(day)}`;
};

export const formatDayLabel = (timestamp: number, now: number): string => {
  const then = zoned(timestamp);
  const current = zoned(now);
  const daysAgo = dayNumber(current) - dayNumber(then);
  if (daysAgo <= 0) return "Oggi";
  if (daysAgo === 1) return "Ieri";
  if (daysAgo < 7) {
    return (
      FULL_WEEKDAYS[new Date(Date.UTC(then.year, then.month - 1, then.day)).getUTCDay()] ?? ""
    ).replace(/^./, (letter) => letter.toUpperCase());
  }
  const month = (MONTHS[then.month - 1] ?? "").toLowerCase();
  const base = `${then.day} ${month}`;
  return then.year === current.year ? base : `${base} ${then.year}`;
};

export const formatThreadTime = (timestamp: number, now: number): string => {
  const then = zoned(timestamp);
  const current = zoned(now);
  const daysAgo = dayNumber(current) - dayNumber(then);
  if (daysAgo <= 0) return clock(then);
  if (daysAgo === 1) return "ieri";
  if (daysAgo < 7) {
    return WEEKDAYS[new Date(Date.UTC(then.year, then.month - 1, then.day)).getUTCDay()] ?? "";
  }
  const month = (MONTHS[then.month - 1] ?? "").toLowerCase();
  return then.year === current.year ? `${then.day} ${month}` : `${then.day} ${month} ${then.year}`;
};
