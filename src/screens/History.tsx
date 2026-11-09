import { useState } from "react";
import { historyLength, historyRange, weeklyRows } from "../days";
import { formatDay } from "../format";
import type { DataApi } from "../useData";
import HistoryChart from "../components/HistoryChart";

export default function History({ api }: { api: DataApi }) {
  const { data, now } = api;
  const [selected, setSelected] = useState(7);
  const length = historyLength(data, now);
  // The longer ranges appear only once the shorter one can no longer show all the history.
  const ranges = [7, 30, ...(length > 30 ? [90] : []), ...(length > 90 ? [365] : [])];
  const range = ranges.includes(selected) ? selected : 7;
  const weekly = range === 365; // a year of daily bars would be too thin to read
  const rows = historyRange(data, now, range);
  const past = rows.filter((r) => !r.isToday);
  const hit = rows.filter((r) => r.reps >= r.target).length;
  const avg = past.length ? Math.round(past.reduce((a, r) => a + r.reps, 0) / past.length) : null;
  const total = rows.reduce((a, r) => a + r.reps, 0);

  return (
    <section className="screen" aria-label="History">
      <header className="topbar">
        <div>
          <h1>History</h1>
          <div className="sub">Reps per day against that day's target</div>
        </div>
      </header>

      <div className="seg" role="group" aria-label="Range">
        {ranges.map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setSelected(r)}>
            {r === 365 ? "1 year" : `${r} days`}
          </button>
        ))}
      </div>

      <div className="summary">
        <div><b>{hit}/{rows.length}</b><span>days on target</span></div>
        <div><b>{avg ?? "–"}</b><span>average reps</span></div>
        <div><b>{total.toLocaleString()}</b><span>total reps</span></div>
      </div>

      <HistoryChart rows={weekly ? weeklyRows(rows) : rows} slots={weekly ? Math.ceil(range / 7) : range} />

      <div>
        <p className="section-label"><span>By day</span></p>
        <table className="days">
          <thead>
            <tr><th>Date</th><th>Reps</th><th>Target</th><th>Result</th></tr>
          </thead>
          <tbody>
            {rows.slice().reverse().map((r) => (
              <tr key={r.date}>
                <td>{r.isToday ? "Today" : formatDay(r.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                <td>{r.reps}</td>
                <td>{r.target}</td>
                {r.reps >= r.target ? (
                  <td className="hit">✓ Hit</td>
                ) : (
                  <td className="miss">{r.isToday ? "In progress" : `−${r.target - r.reps}`}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
