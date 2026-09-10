interface Props {
  label: string;
  current: number;
  total: number;
  hint?: string;
}

/** 진행 표시: 좌 "상황 확인 1 / 2", 우 힌트, 아래 4px 막대 */
export function ProgressHeader({ label, current, total, hint }: Props) {
  const percent = Math.round((Math.min(current, total) / Math.max(total, 1)) * 100);
  return (
    <div className="progress">
      <div className="progress-row">
        <span className="section-label" style={{ letterSpacing: 0 }}>{label} {current} / {total}</span>
        {hint && <span className="caption">{hint}</span>}
      </div>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current} aria-label={label}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
