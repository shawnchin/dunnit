import { useState } from "react";
import { historyRange } from "../days";
import { formatDay } from "../format";
import type { DataApi } from "../useData";
import HistoryChart from "../components/HistoryChart";

const RANGES = [7, 30];

export default function History({ api }: { api: DataApi }) {
  const { data, now } = api;
  const [range, setRange] = useState(7);
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
        {RANGES.map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
            {r} days
          </button>
        ))}
      </div>

      <div className="summary">
        <div><b>{hit}/{rows.length}</b><span>days on target</span></div>
        <div><b>{avg ?? "–"}</b><span>average reps</span></div>
        <div><b>{total.toLocaleString()}</b><span>total reps</span></div>
      </div>

      <HistoryChart rows={rows} slots={range} />

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
