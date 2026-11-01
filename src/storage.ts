import { DEFAULT_PRESETS, dateKey, defaultData, type Data } from "./days";

export const STORAGE_KEY = "dunnit:v1";

export function load(defaultTimeZone: string): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const result = parseImport(raw);
      if (result.ok) return result.data;
    }
  } catch {
    // Storage blocked or unreadable: start fresh.
  }
  return defaultData(defaultTimeZone);
}

export function save(data: Data): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(data));
  } catch {
    // Storage full or blocked: nothing more we can do.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

export function serialize(data: Data): string {
  return JSON.stringify(data, null, 2);
}

export function exportFilename(data: Data, now: Date): string {
  return `dunnit-backup-${dateKey(now, data.settings.timeZone)}.json`;
}

export type ImportResult = { ok: true; data: Data } | { ok: false; error: string };

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isTarget = (x: unknown) => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= 2000;
const isPreset = (x: unknown) => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= 100;
const isPresets = (x: unknown) => Array.isArray(x) && x.length === 3 && x.every(isPreset) && new Set(x).size === 3;

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validate(x: unknown): string | null {
  if (!isObject(x) || x.version !== 1 || !isObject(x.settings) || !isObject(x.days)) {
    return "This file is not a Dunnit backup.";
  }
  const s = x.settings;
  if (!isTarget(s.target)) return "The daily target must be a whole number from 1 to 2000.";
  if (typeof s.timeZone !== "string" || !isTimeZone(s.timeZone)) return `The timezone "${String(s.timeZone)}" is not recognised.`;
  if (typeof s.installCardDismissed !== "boolean") return "This file is not a Dunnit backup.";
  // Backups from before quick-add buttons were configurable have no presets.
  if (s.presets === undefined) s.presets = [...DEFAULT_PRESETS];
  if (!isPresets(s.presets)) return "The quick-add buttons must be three different whole numbers from 1 to 100.";
  (s.presets as number[]).sort((a, b) => a - b);
  for (const [key, day] of Object.entries(x.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || Number.isNaN(Date.parse(key))) return `The day "${key}" is not a valid date.`;
    if (!isObject(day) || !isTarget(day.target) || !Array.isArray(day.sets)) return `The day ${key} has a missing or invalid target.`;
    for (const set of day.sets) {
      if (!isObject(set) || typeof set.at !== "string" || Number.isNaN(Date.parse(set.at)) || !Number.isInteger(set.reps) || (set.reps as number) < 1) {
        return `The day ${key} has a set with a missing time or rep count.`;
      }
    }
  }
  return null;
}

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  const error = validate(parsed);
  return error ? { ok: false, error } : { ok: true, data: parsed as Data };
}
