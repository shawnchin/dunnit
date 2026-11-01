const R = 88;
const C = 2 * Math.PI * R;

export default function Ring({ total, target }: { total: number; target: number }) {
  const progress = Math.min(total / target, 1);
  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="ring-track" cx="100" cy="100" r={R} />
        <circle className="ring-fill" cx="100" cy="100" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
      </svg>
      <div className="ring-center">
        <div className="big" data-testid="total">{total}</div>
        <div className="of">of {target} pushups</div>
      </div>
    </div>
  );
}
