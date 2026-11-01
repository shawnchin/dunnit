/** Formats a "YYYY-MM-DD" key without any timezone shift. */
export function formatDay(key: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: "UTC" }).format(new Date(key + "T12:00:00Z"));
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
