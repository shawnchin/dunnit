import { describe, expect, it } from "vitest";
import {
  addDays,
  addSet,
  dateKey,
  defaultData,
  ensureToday,
  historyRange,
  insertSet,
  removeSet,
  setTarget,
  setTimeZone,
  todayKey,
  type Data,
} from "./days";

const at = (iso: string) => new Date(iso);

describe("dateKey", () => {
  it("formats the date in the given timezone", () => {
    const d = at("2026-11-01T02:30:00Z");
    expect(dateKey(d, "UTC")).toBe("2026-11-01");
    expect(dateKey(d, "America/Los_Angeles")).toBe("2026-10-31");
    expect(dateKey(d, "Asia/Tokyo")).toBe("2026-11-01");
  });

  it("handles daylight-saving changes", () => {
    // New York falls back on 2026-11-01 at 02:00 local (06:00Z).
    expect(dateKey(at("2026-11-01T03:59:00Z"), "America/New_York")).toBe("2026-10-31");
    expect(dateKey(at("2026-11-01T04:00:00Z"), "America/New_York")).toBe("2026-11-01");
    // After the change, midnight is 05:00Z.
    expect(dateKey(at("2026-11-02T04:59:00Z"), "America/New_York")).toBe("2026-11-01");
    expect(dateKey(at("2026-11-02T05:00:00Z"), "America/New_York")).toBe("2026-11-02");
    // Spring forward on 2026-03-08.
    expect(dateKey(at("2026-03-08T04:59:00Z"), "America/New_York")).toBe("2026-03-07");
    expect(dateKey(at("2026-03-08T05:00:00Z"), "America/New_York")).toBe("2026-03-08");
  });
});

describe("addDays", () => {
  it("moves across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("adding and removing sets", () => {
  it("adds sets to today's record using the current target", () => {
    let data = defaultData("Europe/London");
    data = addSet(data, 25, at("2026-11-01T10:00:00Z"));
    data = addSet(data, 17, at("2026-11-01T12:32:00Z"));
    expect(data.days["2026-11-01"]).toEqual({
      target: 100,
      sets: [
        { at: "2026-11-01T10:00:00.000Z", reps: 25 },
        { at: "2026-11-01T12:32:00.000Z", reps: 17 },
      ],
    });
  });

  it("removes a set and can put it back in time order", () => {
    let data = defaultData("UTC");
    data = addSet(data, 10, at("2026-11-01T08:00:00Z"));
    data = addSet(data, 20, at("2026-11-01T09:00:00Z"));
    data = addSet(data, 30, at("2026-11-01T10:00:00Z"));
    const removed = data.days["2026-11-01"].sets[1];
    data = removeSet(data, "2026-11-01", 1);
    expect(data.days["2026-11-01"].sets.map((s) => s.reps)).toEqual([10, 30]);
    data = insertSet(data, "2026-11-01", removed);
    expect(data.days["2026-11-01"].sets.map((s) => s.reps)).toEqual([10, 20, 30]);
  });

  it("does not change the original object", () => {
    const data = defaultData("UTC");
    addSet(data, 10, at("2026-11-01T08:00:00Z"));
    expect(data.days).toEqual({});
  });
});

describe("target changes", () => {
  it("apply to today right away but not to past days", () => {
    let data = defaultData("UTC");
    data = addSet(data, 50, at("2026-10-31T10:00:00Z"));
    data = addSet(data, 20, at("2026-11-01T10:00:00Z"));
    data = setTarget(data, 120, at("2026-11-01T11:00:00Z"));
    expect(data.settings.target).toBe(120);
    expect(data.days["2026-11-01"].target).toBe(120);
    expect(data.days["2026-10-31"].target).toBe(100);
  });

  it("create today's record if it does not exist yet", () => {
    const data = setTarget(defaultData("UTC"), 80, at("2026-11-01T11:00:00Z"));
    expect(data.days["2026-11-01"]).toEqual({ target: 80, sets: [] });
  });
});

describe("timezone changes", () => {
  it("keep each set in the day it was logged", () => {
    let data = defaultData("Europe/London");
    data = addSet(data, 25, at("2026-11-01T01:30:00Z")); // 01:30 London, 1 Nov
    data = setTimeZone(data, "America/New_York");
    expect(data.days["2026-11-01"].sets).toHaveLength(1);
    expect(data.days["2026-10-31"]).toBeUndefined();
  });

  it("never move today back to an earlier date (moving west)", () => {
    let data = defaultData("Europe/London");
    data = addSet(data, 25, at("2026-11-01T01:30:00Z"));
    data = setTimeZone(data, "America/New_York");
    // 02:00Z is still 31 Oct in New York, but today stays 1 Nov.
    expect(todayKey(data, at("2026-11-01T02:00:00Z"))).toBe("2026-11-01");
    data = addSet(data, 10, at("2026-11-01T02:00:00Z"));
    expect(data.days["2026-11-01"].sets).toHaveLength(2);
    // Once New York reaches 2 Nov, the next day starts.
    expect(todayKey(data, at("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
  });

  it("start the next day right away when moving east", () => {
    let data = defaultData("America/New_York");
    data = addSet(data, 25, at("2026-11-02T03:00:00Z")); // 22:00 NY, 1 Nov
    data = setTimeZone(data, "Europe/London");
    expect(todayKey(data, at("2026-11-02T03:30:00Z"))).toBe("2026-11-02");
  });
});

describe("ensureToday", () => {
  it("creates today's record once and keeps the same object when it exists", () => {
    const now = at("2026-11-01T10:00:00Z");
    const data = ensureToday(defaultData("UTC"), now);
    expect(data.days["2026-11-01"]).toEqual({ target: 100, sets: [] });
    expect(ensureToday(data, now)).toBe(data);
  });
});

describe("historyRange", () => {
  function sample(): Data {
    let data = defaultData("UTC");
    data = addSet(data, 90, at("2026-10-28T10:00:00Z"));
    data = setTarget(data, 120, at("2026-10-29T10:00:00Z"));
    data = addSet(data, 130, at("2026-10-29T11:00:00Z"));
    // Nothing logged on 30 and 31 Oct.
    data = addSet(data, 40, at("2026-11-01T09:00:00Z"));
    data = addSet(data, 5, at("2026-11-01T10:00:00Z"));
    return data;
  }

  it("lists the last n days ending today, filling gaps with 0 reps and the earlier target", () => {
    expect(historyRange(sample(), at("2026-11-01T12:00:00Z"), 4)).toEqual([
      { date: "2026-10-29", reps: 130, target: 120, isToday: false },
      { date: "2026-10-30", reps: 0, target: 120, isToday: false },
      { date: "2026-10-31", reps: 0, target: 120, isToday: false },
      { date: "2026-11-01", reps: 45, target: 120, isToday: true },
    ]);
  });

  it("starts at the first recorded day when the range goes back further", () => {
    const rows = historyRange(sample(), at("2026-11-01T12:00:00Z"), 30);
    expect(rows[0].date).toBe("2026-10-28");
    expect(rows).toHaveLength(5);
  });

  it("shows today with the current target even before anything is logged", () => {
    expect(historyRange(defaultData("UTC"), at("2026-11-01T12:00:00Z"), 7)).toEqual([
      { date: "2026-11-01", reps: 0, target: 100, isToday: true },
    ]);
  });
});
