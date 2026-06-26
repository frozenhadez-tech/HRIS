import type { ReactNode } from "react";
import { CHART_COLORS, type Slice } from "@/lib/analytics";

const colorAt = (i: number) => CHART_COLORS[i % CHART_COLORS.length];

/** KPI tile — dark glass with a thin accent strip, like the reference cards. */
export function KpiCard({
  label,
  value,
  accent = "#38bdf8",
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 shadow-[0_10px_30px_-16px_rgba(0,8,24,0.85)]">
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }}
      />
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/55">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

/** Donut with a legend (percent share). */
export function DonutChart({
  data,
  size = 168,
  thickness = 22,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 shrink-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color ?? colorAt(i)}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return seg;
          })}
      </svg>
      <ul className="min-w-36 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.color ?? colorAt(i) }}
            />
            <span className="truncate text-white/70">{d.label}</span>
            <span className="ml-auto font-medium text-white">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Filled area trend (e.g. headcount by year at company). */
export function AreaChart({
  data,
  height = 150,
  color = "#38bdf8",
}: {
  data: Slice[];
  height?: number;
  color?: string;
}) {
  const w = 100;
  const h = 100;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const pts = data.map(
    (d, i) =>
      [n > 1 ? (i / (n - 1)) * w : 0, h - (d.value / max) * h] as const,
  );
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
        className="block"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-white/45">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars with labels + values. */
export function BarList({
  data,
  color = "#2f86ff",
  labelWidth = "w-28",
}: {
  data: Slice[];
  color?: string;
  labelWidth?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span className={`${labelWidth} shrink-0 truncate text-right text-white/70`}>
            {d.label}
          </span>
          <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-white/[0.05]">
            <span
              className="absolute inset-y-0 left-0 rounded-md"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${d.color ?? color}, ${
                  d.color ?? color
                }bb)`,
              }}
            />
          </span>
          <span className="w-8 shrink-0 text-right font-medium tabular-nums text-white">
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars (e.g. by age band). */
export function ColumnChart({
  data,
  color = "#38bdf8",
  height = 180,
}: {
  data: Slice[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-stretch justify-between gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-medium tabular-nums text-white">
            {d.value}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="mx-auto w-full max-w-[46px] rounded-t-md"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 4 : 0,
                background: `linear-gradient(180deg, ${color}, ${color}33)`,
              }}
            />
          </div>
          <span className="text-[11px] text-white/55">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Proportional stacked bar + legend (e.g. by gender). */
export function SplitBar({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div>
      <div className="flex h-11 overflow-hidden rounded-lg ring-1 ring-white/10">
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.label}: ${d.value}`}
            style={{ width: `${(d.value / total) * 100}%`, background: d.color ?? colorAt(i) }}
            className="flex items-center justify-center text-xs font-semibold text-white"
          >
            {d.value / total > 0.1 ? d.value : ""}
          </div>
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: d.color ?? colorAt(i) }}
            />
            <span className="text-white/70">{d.label}</span>
            <span className="font-medium text-white">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
