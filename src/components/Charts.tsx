export function Sparkline({
  values,
  width = 120,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={up ? "#047857" : "#be123c"}
        strokeWidth="1.6"
        points={pts}
      />
    </svg>
  );
}

export function AreaChart({
  values,
  forecast,
  width = 640,
  height = 220,
}: {
  values: number[];
  forecast?: { expected: number; low: number; high: number };
  width?: number;
  height?: number;
}) {
  const pad = 8;
  const histN = values.length;
  const extra = forecast ? 20 : 0;
  const all = forecast
    ? [...values, forecast.low, forecast.high, forecast.expected]
    : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const total = histN + extra;
  const x = (i: number) => pad + (i / (total - 1)) * (width - pad * 2);
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - pad * 2);
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      <path d={line} fill="none" stroke="#064e3b" strokeWidth="1.8" />
      {forecast ? (
        <>
          <path
            d={`M ${x(histN - 1)} ${y(last)} L ${x(total - 1)} ${y(forecast.expected)}`}
            fill="none"
            stroke="#b45309"
            strokeDasharray="4 3"
            strokeWidth="1.6"
          />
          <path
            d={`M ${x(histN - 1)} ${y(last)} L ${x(total - 1)} ${y(forecast.high)} L ${x(total - 1)} ${y(forecast.low)} Z`}
            fill="#b45309"
            opacity="0.12"
          />
        </>
      ) : null}
    </svg>
  );
}
