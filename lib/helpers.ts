// lib/helpers.ts

const TZ = "Asia/Kolkata";

export function getCurrentDateIST(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(new Date());
  return new Date(dateStr + "T00:00:00.000Z");
}

export function getCurrentDateTimeIST(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";

  return new Date(
    Date.UTC(
      +get("year"),
      +get("month") - 1,
      +get("day"),
      +get("hour"),
      +get("minute"),
      +get("second"),
    ),
  );
}

export function buildISTDateTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

export const formatTimeHM = (dateStr: string | Date): string => {
  const date = new Date(dateStr);
  let h = date.getUTCHours();
  const m = date.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export function formatDisplayDateIST(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function formatShortDisplayDateIST(dateString: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export function getISTDayOfWeek(): number {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(new Date());

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[dateStr] ?? 0;
}
