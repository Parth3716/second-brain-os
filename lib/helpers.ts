const TZ = "Asia/Kolkata";
export const DAYS = [
  { value: 1, label: "M", name: "Mon" },
  { value: 2, label: "T", name: "Tue" },
  { value: 3, label: "W", name: "Wed" },
  { value: 4, label: "T", name: "Thu" },
  { value: 5, label: "F", name: "Fri" },
  { value: 6, label: "S", name: "Sat" },
  { value: 0, label: "S", name: "Sun" },
];

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

export function getDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(new Date(date));
  return dateStr;
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
      +get("second")
    )
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

export function getDisplayDateIST(date: string | Date): string {
  if (!date) return "Schedule";

  const targetDate = new Date(date);
  const currentDate = getCurrentDateIST();
  const tomorrowDate = new Date(currentDate);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const yesterdayDate = new Date(currentDate);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);

  if (targetDate.getTime() === currentDate.getTime()) return "Today";
  if (targetDate.getTime() === tomorrowDate.getTime()) return "Tomorrow";
  if (targetDate.getTime() === yesterdayDate.getTime()) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(targetDate);
}

export function getISTDayOfWeek(): number {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(new Date());

  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[dateStr] ?? 0;
}

export function formatDays(daysArray: number[]): string {
  if (daysArray.length === 7) return "Every day";
  if (daysArray.length === 5 && !daysArray.includes(0) && !daysArray.includes(6)) return "Weekdays";
  if (daysArray.length === 2 && daysArray.includes(0) && daysArray.includes(6)) return "Weekends";
  return DAYS
    .filter(d => daysArray.includes(d.value))
    .map(d => d.name)
    .join(", ");
}