import { useCallback, useEffect, useState } from "react";
import { defaultData, ensureToday, type Data } from "./days";
import { clear, load, save } from "./storage";

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** App state, saved to localStorage on every change. Re-checks the day every minute and when the app comes back into view. */
export function useData() {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState(() => ensureToday(load(browserTimeZone()), now));

  useEffect(() => save(data), [data]);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setData((d) => ensureToday(d, n));
    };
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const update = useCallback((fn: (d: Data, now: Date) => Data) => {
    const n = new Date();
    setNow(n);
    setData((d) => fn(d, n));
  }, []);

  const replace = useCallback((d: Data) => setData(ensureToday(d, new Date())), []);

  const reset = useCallback(() => {
    clear();
    setData(ensureToday(defaultData(browserTimeZone()), new Date()));
  }, []);

  return { data, now, update, replace, reset };
}

export type DataApi = ReturnType<typeof useData>;
