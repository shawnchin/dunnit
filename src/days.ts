export type RepSet = { at: string; reps: number };
export type Day = { target: number; sets: RepSet[] };
export type Settings = { target: number; timeZone: string; installCardDismissed: boolean };
export type Data = { version: 1; settings: Settings; days: Record<string, Day> };
export type HistoryRow = { date: string; reps: number; target: number; isToday: boolean };

export const DEFAULT_TARGET = 100;

export function defaultData(timeZone: string): Data {
  return { version: 1, settings: { target: DEFAULT_TARGET, timeZone, installCardDismissed: false }, days: {} };
}

/** The calendar date ("YYYY-MM-DD") of `date` in `timeZone`. */
export function dateKey(date: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function addDays(key: string, n: number): string {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function latestKey(data: Data): string | undefined {
  return Object.keys(data.days).sort().at(-1);
}

/**
 * Today's date in the current timezone. It never goes back before the newest
 * recorded day, so after a timezone change sets stay in the day they were logged.
 */
export function todayKey(data: Data, now: Date): string {
  const key = dateKey(now, data.settings.timeZone);
  const latest = latestKey(data);
  return latest && latest > key ? latest : key;
}

export function ensureToday(data: Data, now: Date): Data {
  const key = todayKey(data, now);
  if (data.days[key]) return data;
  return { ...data, days: { ...data.days, [key]: { target: data.settings.target, sets: [] } } };
}

function updateDay(data: Data, key: string, fn: (day: Day) => Day): Data {
  return { ...data, days: { ...data.days, [key]: fn(data.days[key]) } };
}

export function insertSet(data: Data, key: string, set: RepSet): Data {
  return updateDay(data, key, (day) => ({
    ...day,
    sets: [...day.sets, set].sort((a, b) => a.at.localeCompare(b.at)),
  }));
}

export function addSet(data: Data, reps: number, now: Date): Data {
  data = ensureToday(data, now);
  return insertSet(data, todayKey(data, now), { at: now.toISOString(), reps });
}

export function removeSet(data: Data, key: string, index: number): Data {
  return updateDay(data, key, (day) => ({ ...day, sets: day.sets.filter((_, i) => i !== index) }));
}

/** Changes the target for today and future days. Past days keep theirs. */
export function setTarget(data: Data, target: number, now: Date): Data {
  data = ensureToday({ ...data, settings: { ...data.settings, target } }, now);
  return updateDay(data, todayKey(data, now), (day) => ({ ...day, target }));
}

export function setTimeZone(data: Data, timeZone: string): Data {
  return { ...data, settings: { ...data.settings, timeZone } };
}

export function totalReps(day: Day | undefined): number {
  return day ? day.sets.reduce((sum, s) => sum + s.reps, 0) : 0;
}

/**
 * The last `n` days ending today, starting no earlier than the first recorded day.
 * Days with no record show 0 reps against the most recent earlier target.
 */
export function historyRange(data: Data, now: Date, n: number): HistoryRow[] {
  const today = todayKey(data, now);
  const keys = Object.keys(data.days).sort();
  const first = keys[0] && keys[0] < today ? keys[0] : today;
  let start = addDays(today, -(n - 1));
  if (start < first) start = first;

  let target = data.settings.target;
  const earlier = keys.filter((k) => k < start).at(-1);
  if (earlier) target = data.days[earlier].target;

  const rows: HistoryRow[] = [];
  for (let key = start; key <= today; key = addDays(key, 1)) {
    const day = data.days[key];
    const isToday = key === today;
    if (day) target = day.target;
    else if (isToday) target = data.settings.target;
    rows.push({ date: key, reps: totalReps(day), target, isToday });
  }
  return rows;
}
