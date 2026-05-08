"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export interface HistogramItem {
  label: string;
  value: number; // percentage
  count: number;
}

export function CumulativeHistogram({ data }: { data: HistogramItem[] }) {
  const filtered = data.filter(item => !item.label.startsWith("≥ 0") && !item.label.match(/^0[-–]/));

  const renderLabel = (props: { x?: number; y?: number; width?: number; value?: number }) => {
    const { x = 0, y = 0, width = 0, value } = props;
    if (value == null) return null;
    return (
      <text x={x + width / 2} y={y - 6} fill="#34D399" textAnchor="middle" fontSize={9} fontWeight="bold">
        {(value as number).toFixed(1)}%
      </text>
    );
  };

  return (
    <div className="h-full w-full relative">
      {/* Legend */}
      <div
        className="absolute top-0 right-0 z-10 flex flex-col gap-2 text-[12px] px-3 py-2.5 rounded-lg"
        style={{ border: '1px solid rgba(255,255,255,0.25)', backgroundColor: '#07111F' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#34D399' }}>■</span>
          <span style={{ color: '#34D399' }}>% of weeks with return ≥ range</span>
        </div>
        <div className="pt-1 text-[11px] leading-relaxed" style={{ color: '#7C8BA1', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          Cumulative — each bar shows how many<br />weeks achieved <em>at least</em> that return
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filtered}
          margin={{ top: 28, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A2940" />
          <XAxis
            dataKey="label"
            fontSize={9}
            tick={{ fill: '#7C8BA1' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            fontSize={9}
            tick={{ fill: '#7C8BA1' }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as HistogramItem;
              return (
                <div style={{ backgroundColor: '#0F1B2D', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', lineHeight: '1.8' }}>
                  <p style={{ color: '#fff', fontWeight: 700 }}>Range: {item.label}</p>
                  <p style={{ color: '#fff' }}>Weeks with return at least this value</p>
                  <p style={{ color: '#34D399', fontWeight: 700 }}>{item.value?.toFixed(1)}% of all weeks</p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill="#22C55E" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="value" content={renderLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DiscreteHistogram({ data }: { data: HistogramItem[] }) {
  // Remove the ≥ 0 / 0-1000 bucket — only show from 1000 onwards
  const filtered = data.filter(item => !item.label.startsWith("≥ 0") && !item.label.match(/^0[-–]/));

  const maxCount = Math.max(...filtered.map(d => d.count), 1);
  const totalFiltered = filtered.reduce((sum, d) => sum + d.count, 0);
  const totalAll = data.reduce((sum, d) => sum + d.count, 0);
  const hiddenCount = totalAll - totalFiltered;
  const hiddenPct = totalAll > 0 ? (hiddenCount / totalAll) * 100 : 0;

  // Interpolate hue: yellow (50°) → red (0°) based on relative count
  const barColor = (count: number) => {
    const t = count / maxCount;
    const hue = Math.round(50 * (1 - t));
    return `hsl(${hue}, 90%, 55%)`;
  };

  const renderCustomLabel = (props: { x?: number; y?: number; width?: number; index?: number }) => {
    const { x = 0, y = 0, width = 0, index = 0 } = props;
    const item = filtered[index];
    if (!item) return null;
    const localPct = totalFiltered > 0 ? (item.count / totalFiltered) * 100 : 0;
    return (
      <g>
        <text x={x + width / 2} y={y - 8} fill="#FFFFFF" textAnchor="middle" fontSize={10} fontWeight="bold">
          {item.count}w
        </text>
        <text x={x + width / 2} y={y - 21} fill="#60A5FA" textAnchor="middle" fontSize={8}>
          {item.value?.toFixed(1)}%
        </text>
        <text x={x + width / 2} y={y - 32} fill="#34D399" textAnchor="middle" fontSize={8}>
          {localPct.toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <div className="h-full w-full relative">
      {/* Legend — top right */}
      <div className="absolute top-0 right-0 z-10 flex flex-col gap-2 text-[12px] px-3 py-2.5 rounded-lg"
        style={{ border: '1px solid rgba(255,255,255,0.25)', backgroundColor: '#07111F' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: '#34D399' }}>■</span>
          <span style={{ color: '#34D399' }}>% of visible bars (sums to 100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: '#60A5FA' }}>■</span>
          <span style={{ color: '#60A5FA' }}>% of all weeks (global)</span>
        </div>
        {hiddenPct > 0 && (
          <div className="pt-1 leading-relaxed" style={{ color: '#7C8BA1', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: '#F87171', fontWeight: 700 }}>{hiddenPct.toFixed(1)}%</span> of weeks returned
            <br />below $1,000 — not displayed
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filtered}
          margin={{ top: 50, right: 10, left: 10, bottom: 0 }}
        >
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as HistogramItem;
              return (
                <div style={{ backgroundColor: '#0F1B2D', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', lineHeight: '1.8' }}>
                  <p style={{ color: '#fff', fontWeight: 700 }}>Range: {item.label}</p>
                  <p style={{ color: '#fff' }}>Achieved and closed in this range</p>
                  <p style={{ color: '#fff', fontWeight: 700 }}>Weeks: {item.count}w</p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {filtered.map((item, index) => (
              <Cell key={index} fill={barColor(item.count)} />
            ))}
            <LabelList dataKey="value" content={renderCustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
