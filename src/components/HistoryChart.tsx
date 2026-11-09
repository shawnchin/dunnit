import { useState } from "react";
import type { HistoryRow } from "../days";
import { formatDay } from "../format";

const W = 340, H = 210, L = 30, R = 6, T = 10, B = 26;

function niceStep(max: number): number {
  return max / 5 >= 25 ? 50 : 25;
}

/**
 * Bars of reps per day with each day's target drawn as a dashed step line. `slots` fixes the bar width for the range.
 * Weekly rows (those with an `end`) are drawn the same way, as average reps per day against the average target.
 */
export default function HistoryChart({ rows, slots }: { rows: HistoryRow[]; slots: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const weekly = rows[0].end !== undefined;
  const max = Math.max(...rows.map((d) => Math.max(d.reps, d.target)));
  const yMax = Math.ceil((max * 1.1) / 25) * 25;
  const step = niceStep(yMax);
  const y = (v: number) => T + (H - T - B) * (1 - v / yMax);
  const band = (W - L - R) / slots;
  const offset = slots - rows.length; // align to the right when there is less history than the range
  const x0 = (i: number) => L + band * (i + offset);
  const bw = Math.max(2, Math.min(28, band * 0.62));

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  const targetPath = rows.map((d, i) => (i === 0 ? `M${x0(i)},${y(d.target)}` : `V${y(d.target)}`) + `H${x0(i) + band}`).join("");

  const bar = (d: HistoryRow, i: number) => {
    const h = y(0) - y(d.reps);
    if (h <= 0) return "";
    const r = Math.min(4, bw / 2, h);
    const x = x0(i) + band / 2 - bw / 2, top = y(d.reps), base = y(0);
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${base}Z`;
  };

  const label = (d: HistoryRow, i: number) => {
    if (d.isToday && !weekly) return "Today";
    if (slots <= 7) return formatDay(d.date, { weekday: "short" });
    const every = weekly ? 8 : slots > 30 ? 14 : 7; // keeps the labels from running into each other
    return (rows.length - 1 - i) % every === 0 ? formatDay(d.date, { day: "numeric", month: "short" }) : null;
  };

  const tipTitle = (d: HistoryRow) => {
    if (!weekly) return d.isToday ? "Today" : formatDay(d.date, { weekday: "short", day: "numeric", month: "short" });
    const from = formatDay(d.date, { day: "numeric", month: "short" });
    return d.end === d.date ? from : `${from} – ${formatDay(d.end!, { day: "numeric", month: "short" })}`;
  };

  const h = hover !== null ? rows[hover] : null;

  return (
    <div className="chart-box" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={weekly ? "Bar chart of average daily reps per week with the average target as a dashed line" : "Bar chart of daily reps with the daily target as a dashed line"}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="axis-t" x={L - 6} y={y(v) + 3} textAnchor="end">{v}</text>
          </g>
        ))}
        {rows.map((d, i) => (
          <path key={d.date} className={"bar" + (d.isToday ? " today" : "") + (hover === i ? " hover" : "")} d={bar(d, i)} />
        ))}
        {rows.map((d, i) => {
          const text = label(d, i);
          return text ? <text key={d.date} className="axis-t" x={x0(i) + band / 2} y={H - 8} textAnchor="middle">{text}</text> : null;
        })}
        <path className="target" d={targetPath} />
        {rows.map((d, i) => (
          <rect
            key={d.date}
            x={x0(i)}
            y={T}
            width={band}
            height={H - T - B}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerDown={() => setHover(i)}
          />
        ))}
      </svg>
      {h && hover !== null && (
        <div
          className="tip"
          style={{
            left: `clamp(60px, ${((x0(hover) + band / 2) / W) * 100}%, calc(100% - 60px))`,
            top: `calc(${(Math.min(y(h.reps), y(h.target)) / H) * 100}% - 8px)`,
          }}
        >
          {tipTitle(h)}
          <br />
          {weekly && "avg "}<b>{Math.round(h.reps)}</b> of {Math.round(h.target)}
          {!weekly && h.reps >= h.target ? " · on target" : ""}
        </div>
      )}
      <div className="legend">
        <span><i className="lg-bar" />{weekly ? "Average reps" : "Reps"}</span>
        <span><i className="lg-today" />{weekly ? "Last 7 days (in progress)" : "Today (in progress)"}</span>
        <span><i className="lg-line" />{weekly ? "Average target" : "Target"}</span>
      </div>
    </div>
  );
}
