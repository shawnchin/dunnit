import { useEffect, useRef, useState, type FormEvent } from "react";
import { addSet, insertSet, removeSet, todayKey, totalReps, type RepSet } from "../days";
import { formatDay, formatTime } from "../format";
import { isInstalled } from "../useInstallPrompt";
import type { DataApi } from "../useData";
import Ring from "../components/Ring";

export default function Today({ api, onShowInstall }: { api: DataApi; onShowInstall: () => void }) {
  const { data, now, update } = api;
  const key = todayKey(data, now);
  const day = data.days[key];
  const total = totalReps(day);
  const target = day?.target ?? data.settings.target;
  const sets = day?.sets ?? [];
  const tz = data.settings.timeZone;
  const presets = data.settings.presets;

  const [custom, setCustom] = useState("");
  const [removed, setRemoved] = useState<{ key: string; set: RepSet } | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const add = (reps: number) => update((d, n) => addSet(d, reps, n));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const reps = parseInt(custom, 10);
    if (reps > 0 && reps < 1000) {
      add(reps);
      setCustom("");
    }
  };

  const remove = (index: number) => {
    setRemoved({ key, set: sets[index] });
    update((d) => removeSet(d, key, index));
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRemoved(null), 5000);
  };

  const undo = () => {
    if (removed) update((d) => insertSet(d, removed.key, removed.set));
    setRemoved(null);
  };

  const showInstallCard = !data.settings.installCardDismissed && !isInstalled();

  return (
    <section className="screen" aria-label="Today">
      <header className="topbar">
        <div>
          <h1>Today</h1>
          <div className="sub">{formatDay(key, { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        <span className="tz">{tz}</span>
      </header>

      {showInstallCard && (
        <div className="install-card">
          <p>Add Dunnit to your home screen for one-tap logging.</p>
          <button className="link" onClick={onShowInstall}>How</button>
          <button
            className="x"
            aria-label="Dismiss"
            onClick={() => update((d) => ({ ...d, settings: { ...d.settings, installCardDismissed: true } }))}
          >
            ×
          </button>
        </div>
      )}

      <div>
        <Ring total={total} target={target} />
        <div className={total >= target ? "status done" : "status"} role="status">
          {total >= target ? (total > target ? `Target hit, ${total - target} extra` : "Target hit") : `${target - total} to go`}
        </div>
      </div>

      <div className="entry">
        <div className="presets">
          {presets.map((n) => (
            <button key={n} className="preset" aria-label={`Add ${n} reps`} onClick={() => add(n)}>
              +{n}
            </button>
          ))}
        </div>
        <form className="custom" onSubmit={submit}>
          <input
            id="customReps"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            placeholder="Other amount"
            aria-label="Number of reps"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
      </div>

      <div>
        <p className="section-label">
          <span>Today's sets</span>
          <span>{sets.length ? `${sets.length} ${sets.length === 1 ? "set" : "sets"}` : ""}</span>
        </p>
        <ul className="log">
          {sets.length === 0 && (
            <li className="empty">No sets yet. Tap +{presets[0]}, +{presets[1]} or +{presets[2]} after your first set.</li>
          )}
          {sets
            .map((s, i) => ({ s, i }))
            .reverse()
            .map(({ s, i }) => {
              const time = formatTime(s.at, tz);
              return (
                <li key={s.at + i}>
                  <span className="time">{time}</span>
                  <span className="reps">{s.reps} reps</span>
                  <button className="del" aria-label={`Delete set of ${s.reps} at ${time}`} onClick={() => remove(i)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>

      {removed && (
        <div className="toast" role="status">
          <span>
            Deleted {removed.set.reps} reps from {formatTime(removed.set.at, tz)}
          </span>
          <button onClick={undo}>Undo</button>
        </div>
      )}
    </section>
  );
}
