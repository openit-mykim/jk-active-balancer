import type { ReactElement } from "react";

/** Minimal dependency-free SVG line chart for history (design section 14.3). */
export function Sparkline({ points, label }: { points: ReadonlyArray<{ x: number; y: number }>; label: string }): ReactElement {
  const width = 600;
  const height = 80;
  if (points.length < 2) {
    return <p className="muted small">{label}: collecting history...</p>;
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxY - minY < 1e-6) {
    minY -= 0.001;
    maxY += 0.001;
  }
  const path = points
    .map((p, i) => {
      const x = ((p.x - minX) / Math.max(1, maxX - minX)) * width;
      const y = height - ((p.y - minY) / (maxY - minY)) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <figure className="spark">
      <figcaption className="muted small">
        {label}: {ys[ys.length - 1].toFixed(4)} (min {minY.toFixed(4)}, max {maxY.toFixed(4)})
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}
