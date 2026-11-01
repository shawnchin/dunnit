import { describe, expect, it } from "vitest";
import { addSet, defaultData } from "./days";
import { STORAGE_KEY, exportFilename, load, parseImport, save, serialize } from "./storage";

const now = new Date("2026-11-01T10:00:00Z");

describe("load and save", () => {
  it("returns default data on first run", () => {
    expect(load("Europe/London")).toEqual(defaultData("Europe/London"));
  });

  it("returns what was saved", () => {
    const data = addSet(defaultData("UTC"), 25, now);
    save(data);
    expect(load("Europe/London")).toEqual(data);
  });

  it("falls back to default data when the stored value is broken", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(load("UTC")).toEqual(defaultData("UTC"));
  });
});

describe("export and import", () => {
  it("round-trips the data", () => {
    const data = addSet(defaultData("UTC"), 25, now);
    expect(parseImport(serialize(data))).toEqual({ ok: true, data });
  });

  it("names the file after today's date", () => {
    expect(exportFilename(defaultData("Asia/Tokyo"), new Date("2026-11-01T20:00:00Z"))).toBe(
      "dunnit-backup-2026-11-02.json",
    );
  });

  const bad: [string, string, string][] = [
    ["not JSON", "hello", "This file is not valid JSON."],
    ["another app's file", JSON.stringify({ foo: 1 }), "This file is not a Dunnit backup."],
    [
      "a bad target",
      JSON.stringify({ ...defaultData("UTC"), settings: { target: -5, timeZone: "UTC", installCardDismissed: false } }),
      "The daily target must be a whole number from 1 to 2000.",
    ],
    [
      "an unknown timezone",
      JSON.stringify({ ...defaultData("UTC"), settings: { target: 100, timeZone: "Mars/Base", installCardDismissed: false } }),
      'The timezone "Mars/Base" is not recognised.',
    ],
    [
      "a bad date",
      JSON.stringify({ ...defaultData("UTC"), days: { "1 Nov": { target: 100, sets: [] } } }),
      'The day "1 Nov" is not a valid date.',
    ],
    [
      "a bad set",
      JSON.stringify({ ...defaultData("UTC"), days: { "2026-11-01": { target: 100, sets: [{ at: "later", reps: 5 }] } } }),
      "The day 2026-11-01 has a set with a missing time or rep count.",
    ],
  ];
  it.each(bad)("rejects %s with a clear message", (_name, text, error) => {
    expect(parseImport(text)).toEqual({ ok: false, error });
  });
});
