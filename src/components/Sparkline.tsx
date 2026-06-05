// Dependency-free SVG line chart. Higher value = higher on screen; the caller's
// trend chip conveys whether up is good. `detailed` adds dots + emphasizes the
// latest point for the expanded view.
export default function Sparkline({
  values,
  width = 96,
  height = 28,
  detailed = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  detailed?: boolean;
}) {
  if (values.length < 2) return null;
  const pad = detailed ? 8 : 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const gid = `spark-${width}-${height}-${detailed ? 'd' : 's'}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFD500" />
          <stop offset="50%" stopColor="#FF9B5C" />
          <stop offset="100%" stopColor="#FF6B6B" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={detailed ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {detailed &&
        values.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === values.length - 1 ? 3.5 : 2}
            fill={i === values.length - 1 ? '#FF6B6B' : '#0a0a0a'}
            stroke={i === values.length - 1 ? '#FF6B6B' : `url(#${gid})`}
            strokeWidth={1.5}
          />
        ))}
    </svg>
  );
}
