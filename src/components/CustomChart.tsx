/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

// Handcrafted SVG-based highly realistic graphs to ensure 0 React 19 compile bugs

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  strokeColor?: string;
}

export function CustomLineChart({ data, height = 180, strokeColor = '#3b82f6' }: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-400">Tidak ada data grafik</div>;

  const maxVal = Math.max(...data.map(d => d.value), 10);
  const paddingX = 40;
  const paddingY = 20;
  const width = 500;
  
  // Map values to coordinates
  const points = data.map((d, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (data.length - 1 || 1);
    const y = height - paddingY - (d.value / maxVal) * (height - paddingY * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = height - paddingY - ratio * (height - paddingY * 2);
    const val = Math.round(ratio * maxVal);
    return { y, value: val };
  });

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height: `${height}px` }}>
        {/* Horizontal Grid */}
        {gridLines.map((line, idx) => (
          <g key={idx}>
            <line 
              x1={paddingX} 
              y1={line.y} 
              x2={width - paddingX} 
              y2={line.y} 
              stroke="#e2e8f0" 
              strokeDasharray="4 4" 
              strokeWidth="1"
            />
            <text 
              x={paddingX - 8} 
              y={line.y + 3} 
              textAnchor="end" 
              className="text-[9px] fill-slate-400 font-mono"
            >
              {line.value >= 1000000 
                ? `${(line.value / 1000000).toFixed(1)}Jt` 
                : line.value >= 1000 
                  ? `${(line.value / 1000).toFixed(0)}K` 
                  : line.value}
            </text>
          </g>
        ))}

        {/* The Connection Area fill */}
        {points.length > 1 && (
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`}
            fill={`url(#gradient-${strokeColor.replace('#', '')})`}
            opacity="0.15"
          />
        )}

        {/* The Sparkline Path */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Hover point and markers */}
        {points.map((p, idx) => (
          <g key={idx} onMouseEnter={() => setHoverIndex(idx)} onMouseLeave={() => setHoverIndex(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 4}
              className={`cursor-pointer transition-all ${hoverIndex === idx ? 'fill-white stroke-2' : 'fill-blue-600 stroke-1'}`}
              stroke={strokeColor}
            />
            {/* Invisible larger hover zone */}
            <circle
              cx={p.x}
              cy={p.y}
              r={15}
              fill="transparent"
              className="cursor-pointer"
            />
          </g>
        ))}

        {/* X labels */}
        {points.map((p, idx) => (
          (idx % Math.ceil(data.length / 6) === 0 || idx === data.length - 1) && (
            <text
              key={idx}
              x={p.x}
              y={height - 4}
              textAnchor="middle"
              className="text-[10px] fill-slate-500 font-sans"
            >
              {p.label}
            </text>
          )
        ))}

        {/* Define gradients */}
        <defs>
          <linearGradient id={`gradient-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Pop up Tooltip overlay */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div 
          className="absolute bg-slate-900 text-white px-2.5 py-1.5 rounded shadow-lg text-[11px] font-medium z-10 pointer-events-none -translate-x-1/2 -translate-y-full transform flex flex-col items-center"
          style={{
            left: `${(points[hoverIndex].x / width) * 100}%`,
            top: `${(points[hoverIndex].y / height) * 100 - 8}%`
          }}
        >
          <span className="text-slate-300 font-light text-[9px] uppercase tracking-wider">{points[hoverIndex].label}</span>
          <span className="font-sans font-semibold mt-0.5">
            {points[hoverIndex].value >= 1000 
              ? `Rp ${points[hoverIndex].value.toLocaleString('id-ID')}` 
              : `${points[hoverIndex].value} Jemaat`}
          </span>
        </div>
      )}
    </div>
  );
}

// Side-by-side or stacked comparative Bar Chart
interface BarChartProps {
  data: { label: string; value1: number; value2?: number; color1?: string; color2?: string }[];
  label1?: string;
  label2?: string;
  height?: number;
}

export function CustomBarChart({ data, label1 = "Income", label2 = "Expense", height = 180 }: BarChartProps) {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-400">Tidak ada data column</div>;

  const maxVal = Math.max(...data.flatMap(d => [d.value1, d.value2 || 0]), 1000);
  const paddingX = 40;
  const paddingY = 20;
  const width = 500;
  
  const chartHeight = height - paddingY * 2;
  const barWidth = 14;
  const gap = 4;
  const groupWidth = (width - paddingX * 2) / data.length;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height: `${height}px` }}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = height - paddingY - ratio * chartHeight;
          const val = Math.round(ratio * maxVal);
          return (
            <g key={idx}>
              <line 
                x1={paddingX} 
                y1={y} 
                x2={width - paddingX} 
                y2={y} 
                stroke="#f1f5f9" 
                strokeWidth="1"
              />
              <text 
                x={paddingX - 8} 
                y={y + 3} 
                textAnchor="end" 
                className="text-[9px] fill-slate-400 font-mono"
              >
                {val >= 1000000 
                  ? `${(val / 1000000).toFixed(1)}Jt` 
                  : val >= 1000 
                    ? `${(val / 1000).toFixed(0)}K` 
                    : val}
              </text>
            </g>
          );
        })}

        {/* Drawn Bars */}
        {data.map((item, idx) => {
          const groupX = paddingX + idx * groupWidth + (groupWidth - (barWidth * (item.value2 !== undefined ? 2 : 1) + gap)) / 2;
          const h1 = (item.value1 / maxVal) * chartHeight;
          const y1 = height - paddingY - h1;

          let h2 = 0;
          let y2 = 0;
          if (item.value2 !== undefined) {
            h2 = (item.value2 / maxVal) * chartHeight;
            y2 = height - paddingY - h2;
          }

          return (
            <g key={idx} className="group cursor-pointer">
              {/* Bar 1 */}
              <rect
                x={groupX}
                y={y1}
                width={barWidth}
                height={Math.max(h1, 1)}
                fill={item.color1 || '#3b82f6'}
                rx="3.5"
                className="transition-all hover:brightness-105 duration-200"
              />
              
              {/* Bar 2 (optional) */}
              {item.value2 !== undefined && (
                <rect
                  x={groupX + barWidth + gap}
                  y={y2}
                  width={barWidth}
                  height={Math.max(h2, 1)}
                  fill={item.color2 || '#ef4444'}
                  rx="3.5"
                  className="transition-all hover:brightness-105 duration-200"
                />
              )}

              {/* Tooltip dynamic hover */}
              <title>
                {`${item.label}\n${label1}: Rp ${item.value1.toLocaleString('id-ID')}` +
                 (item.value2 !== undefined ? `\n${label2}: Rp ${item.value2.toLocaleString('id-ID')}` : '')}
              </title>

              {/* X label */}
              <text
                x={groupX + barWidth / (item.value2 !== undefined ? 1 : 2) + gap / 2}
                y={height - 4}
                textAnchor="middle"
                className="text-[9px] fill-slate-500 font-sans"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Donut/Pie Chart Representation
export function CustomDonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  if (total === 0) return <div className="h-40 flex items-center justify-center text-slate-400">Tidak ada persentase jemaat</div>;

  let accumulatedAngle = 0;
  const radius = 60;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const center = 80;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around p-2 space-y-4 sm:space-y-0">
      <svg width="160" height="160" className="overflow-visible select-none">
        {slices.map((slice, idx) => {
          const ratio = slice.value / total;
          const strokeLength = ratio * circumference;
          const strokeOffset = circumference - strokeLength + accumulatedAngle;
          accumulatedAngle -= strokeLength;

          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeLength} ${circumference}`}
              strokeDashoffset={strokeOffset}
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-300 hover:stroke-[16px] cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.value} (${(ratio * 100).toFixed(1)}%)`}</title>
            </circle>
          );
        })}
        
        {/* Center label */}
        <text x={center} y={center - 3} textAnchor="middle" className="text-[10px] font-medium fill-slate-400 uppercase tracking-wider">Total</text>
        <text x={center} y={center + 12} textAnchor="middle" className="text-xl font-extrabold fill-slate-800 font-sans">{total}</text>
      </svg>

      {/* Legend list */}
      <div className="flex flex-col space-y-2 max-w-[180px]">
        {slices.map((slice, idx) => {
          const ratio = (slice.value / total) * 100;
          return (
            <div key={idx} className="flex items-center space-x-2 text-xs">
              <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: slice.color }}></span>
              <span className="text-slate-600 truncate font-medium">{slice.label}</span>
              <span className="text-slate-400 font-mono text-[11px] ml-auto">({ratio.toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
