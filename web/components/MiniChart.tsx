import React from 'react';

/* ── MiniDonut: 环形图 ── */
interface DonutSlice { value: number; color: string; }
interface MiniDonutProps { size: number; slices: DonutSlice[]; innerRadius?: number; }

export const MiniDonut: React.FC<MiniDonutProps> = ({ size, slices, innerRadius = 0.55 }) => {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const r = size / 2;
  const ir = r * innerRadius;
  let cumAngle = -Math.PI / 2;

  const paths = slices.map((slice, i) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const startAngle = cumAngle;
    cumAngle += angle;

    // For a full circle (single slice), use two arcs
    if (slices.length === 1) {
      const mid = startAngle + Math.PI;
      return (
        <React.Fragment key={i}>
          <path fill={slice.color} d={arcPath(r, ir, startAngle, mid, size)} />
          <path fill={slice.color} d={arcPath(r, ir, mid, cumAngle, size)} />
        </React.Fragment>
      );
    }

    return <path key={i} fill={slice.color} d={arcPath(r, ir, startAngle, cumAngle, size)} />;
  });

  return <svg width={size} height={size} className="shrink-0">{paths}</svg>;
};

function arcPath(outerR: number, innerR: number, startAngle: number, endAngle: number, size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);
  const ix1 = cx + innerR * Math.cos(endAngle);
  const iy1 = cy + innerR * Math.sin(endAngle);
  const ix2 = cx + innerR * Math.cos(startAngle);
  const iy2 = cy + innerR * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
}

/* ── MiniGauge: 渐变圆环仪表 ── */
interface MiniGaugeProps { size: number; percent: number; strokeWidth?: number; label?: string; }

export const MiniGauge: React.FC<MiniGaugeProps> = ({ size, percent, strokeWidth = 4, label }) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);
  const colorStop = percent > 80 ? ['#ef4444', '#f97316'] : percent > 50 ? ['#f59e0b', '#eab308'] : ['#22c55e', '#10b981'];
  const gradId = `gauge-${size}-${Math.round(percent)}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-200/40 dark:text-white/[0.06]" />
        <defs><linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={colorStop[0]} /><stop offset="100%" stopColor={colorStop[1]} /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      {label && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums text-slate-600 dark:text-white/60">{label}</span>}
    </div>
  );
};

/* ── MiniSparkline: 折线面积图 ── */
interface MiniSparklineProps { values: number[]; height?: number; color?: string; }

export const MiniSparkline: React.FC<MiniSparklineProps> = ({ values, height = 32, color = '#3b82f6' }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const w = 100;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const linePath = `M ${pts.join(' L ')}`;
  const areaPath = `${linePath} L ${w},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <path d={areaPath} fill={color} fillOpacity={0.1} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── MiniBarChart: 竖条柱状图 ── */
interface MiniBarChartProps { values: number[]; height?: number; color?: string; }

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ values, height = 48, color = '#3b82f6' }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const gap = 2;
  const barW = Math.min(14, Math.max(1, (100 - gap * (values.length - 1)) / values.length));
  const totalW = values.length * barW + (values.length - 1) * gap;
  const offsetX = (100 - totalW) / 2;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * (height - 4));
        return (
          <rect key={i} x={offsetX + i * (barW + gap)} y={height - h} width={barW} height={h}
            rx={1.5} fill={color} fillOpacity={0.7}
          />
        );
      })}
    </svg>
  );
};
