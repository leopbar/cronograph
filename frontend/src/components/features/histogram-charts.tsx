"use client";

import * as React from "react";

export interface HistogramItem {
  label: string;
  value: number; // percentage
  count: number;
}

export interface ExportRow {
  label: string;
  count: number;
  pct1: number;   // primary % (green)
  pct2?: number;  // secondary % (blue) — discrete only
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function ModeToggle({ mode, setMode }: { mode: 'usd' | 'pct'; setMode: (m: 'usd' | 'pct') => void }) {
  return (
    <div className="flex gap-1 px-2 py-1.5 rounded-lg w-fit"
      style={{ border: '1px solid rgba(255,255,255,0.25)', backgroundColor: '#07111F' }}>
      <button
        onClick={() => setMode('usd')}
        className="px-2 py-0.5 rounded text-[10px] font-bold transition-colors"
        style={mode === 'usd' ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' } : { color: '#7C8BA1' }}
      >
        USD
      </button>
      <button
        onClick={() => setMode('pct')}
        className="px-2 py-0.5 rounded text-[10px] font-bold transition-colors"
        style={mode === 'pct' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60A5FA' } : { color: '#7C8BA1' }}
      >
        %
      </button>
    </div>
  );
}

export const fmtUsd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function prettyUsdLabel(label: string): string {
  const ge = label.match(/^≥\s*(\d+)/);
  if (ge) return `≥ ${fmtUsd(Number(ge[1]))}`;
  const range = label.match(/^(\d+)[-–](\d+)$/);
  if (range) return `${fmtUsd(Number(range[1]))}–${fmtUsd(Number(range[2]))}`;
  return label;
}

const thBase = "px-4 py-2.5 text-[11px] font-bold text-[#4F5B70] uppercase tracking-wider";
const tdBase = "px-4 py-2.5 text-[13px]";

// ---------------------------------------------------------------------------
// Return Distribution (cumulative) — table
// ---------------------------------------------------------------------------

interface CumulativeTableProps {
  data: HistogramItem[];
  results: Array<{ return_pct: number }>;
  onExportData?: (rows: ExportRow[], mode: 'usd' | 'pct', title: string) => void;
  periodLabel?: string;
}

export function CumulativeTable({ data, results, onExportData, periodLabel = 'weeks' }: CumulativeTableProps) {
  const { rows, negativePct, negativeCount } = React.useMemo(() => {
    if (results.length === 0) return { rows: [], negativePct: 0, negativeCount: 0 };
    const total = results.length;
    const maxPct = Math.floor(Math.max(...results.map(r => r.return_pct)));
    const items: HistogramItem[] = [];
    for (let threshold = 0; threshold <= maxPct; threshold++) {
      const count = results.filter(r => r.return_pct >= threshold).length;
      items.push({ label: `≥ ${threshold}%`, count, value: (count / total) * 100 });
    }
    const negCount = results.filter(r => r.return_pct < 0).length;
    return {
      rows: items,
      negativePct: (negCount / total) * 100,
      negativeCount: negCount,
    };
  }, [results]);

  const maxValue = Math.max(...rows.map(r => r.value), 1);

  // Expose current data to parent for PDF export
  React.useEffect(() => {
    if (!onExportData) return;
    const exportRows: ExportRow[] = rows.map(item => ({
      label: item.label,
      count: item.count,
      pct1: item.value,
    }));
    onExportData(exportRows, 'pct', 'Return Distribution');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end shrink-0 mb-3">
        <span className="text-[10px] text-[#4F5B70] leading-tight text-right">
          Cumulative — {periodLabel} that achieved<br /><em>at least</em> that % return
        </span>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0F1B2D] z-10">
            <tr className="border-b border-white/5">
              <th className={thBase}>Return ≥</th>
              <th className={`${thBase} text-right`}>{periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}</th>
              <th className={`${thBase} text-right`}>% of {periodLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {rows.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                <td className={`${tdBase} font-bold text-white`}>{item.label}</td>
                <td className={`${tdBase} text-right font-mono text-[#B6C2D1]`}>{item.count}</td>
                <td className={`${tdBase} text-right font-mono font-bold relative`}>
                  <span
                    className="absolute inset-y-1 right-1 rounded"
                    style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: 'rgba(52,211,153,0.10)', maxWidth: '100%' }}
                  />
                  <span className="relative" style={{ color: '#34D399' }}>{item.value.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {negativeCount > 0 && (
        <div className="shrink-0 mt-3 px-3 py-2.5 rounded-lg text-[10px] leading-relaxed"
          style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
          <span style={{ color: '#F87171', fontWeight: 700 }}>{negativePct.toFixed(1)}% of {periodLabel}</span>
          <span style={{ color: '#7C8BA1' }}>
            {' '}({negativeCount} {negativeCount === 1 ? periodLabel.replace(/s$/, '') : periodLabel}) ended with a{' '}
            <strong style={{ color: '#F87171' }}>negative return (below 0%)</strong> and are not represented in the table above,
            which only shows {periodLabel} that broke even or gained.
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week Frequency (discrete) — table
// ---------------------------------------------------------------------------

interface DiscreteTableProps {
  data: HistogramItem[];
  results: Array<{ return_pct: number }>;
  onExportData?: (rows: ExportRow[], mode: 'usd' | 'pct', title: string) => void;
  periodLabel?: string;
}

export function DiscreteTable({ data, results, onExportData, periodLabel = 'Weeks' }: DiscreteTableProps) {
  const [mode, setMode] = React.useState<'usd' | 'pct'>('usd');

  const usdFiltered = data.filter(item => !item.label.startsWith("≥ 0") && !item.label.match(/^0[-–]/));

  const pctFiltered = React.useMemo(() => {
    const buckets = new Map<number, number>();
    for (const r of results) {
      if (r.return_pct < 0) continue;
      const bucket = Math.floor(r.return_pct);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }
    const total = results.length;
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, count]) => ({
        label: `${bucket}%-${bucket + 1}%`,
        count,
        value: (count / total) * 100,
      }));
  }, [results]);

  const rows = mode === 'usd' ? usdFiltered : pctFiltered;

  const totalFiltered = rows.reduce((sum, d) => sum + d.count, 0);
  const totalAll = mode === 'usd' ? data.reduce((sum, d) => sum + d.count, 0) : results.length;
  const hiddenCount = totalAll - totalFiltered;
  const hiddenPct = totalAll > 0 ? (hiddenCount / totalAll) * 100 : 0;

  const maxLocal = Math.max(...rows.map(r => (totalFiltered > 0 ? (r.count / totalFiltered) * 100 : 0)), 1);

  // Expose current data to parent for PDF export
  React.useEffect(() => {
    if (!onExportData) return;
    const exportRows: ExportRow[] = rows.map(item => {
      const localPct = totalFiltered > 0 ? (item.count / totalFiltered) * 100 : 0;
      return {
        label: mode === 'usd' ? prettyUsdLabel(item.label) : item.label,
        count: item.count,
        pct1: localPct,
        pct2: item.value,
      };
    });
    onExportData(exportRows, mode, 'Week Frequency');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mode]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0 mb-3">
        <ModeToggle mode={mode} setMode={setMode} />
        <div className="flex flex-col gap-0.5 text-[10px] text-right leading-tight">
          <span style={{ color: '#34D399' }}>% of visible (sums to 100%)</span>
          <span style={{ color: '#60A5FA' }}>% of all weeks (global)</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0F1B2D] z-10">
            <tr className="border-b border-white/5">
              <th className={thBase}>Range</th>
              <th className={`${thBase} text-right`}>{periodLabel}</th>
              <th className={`${thBase} text-right`} style={{ color: '#34D399' }}>% visible</th>
              <th className={`${thBase} text-right`} style={{ color: '#60A5FA' }}>% all</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {rows.map((item, idx) => {
              const localPct = totalFiltered > 0 ? (item.count / totalFiltered) * 100 : 0;
              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className={`${tdBase} font-bold text-white`}>
                    {mode === 'usd' ? prettyUsdLabel(item.label) : item.label}
                  </td>
                  <td className={`${tdBase} text-right font-mono text-white font-bold`}>{item.count}{periodLabel[0].toLowerCase()}</td>
                  <td className={`${tdBase} text-right font-mono font-bold relative`}>
                    <span
                      className="absolute inset-y-1 right-1 rounded"
                      style={{ width: `${(localPct / maxLocal) * 100}%`, backgroundColor: 'rgba(52,211,153,0.10)', maxWidth: '100%' }}
                    />
                    <span className="relative" style={{ color: '#34D399' }}>{localPct.toFixed(1)}%</span>
                  </td>
                  <td className={`${tdBase} text-right font-mono`} style={{ color: '#60A5FA' }}>
                    {item.value.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hiddenPct > 0 && (
        <div className="shrink-0 pt-2 text-[10px] leading-relaxed text-[#7C8BA1]">
          <span style={{ color: '#F87171', fontWeight: 700 }}>{hiddenPct.toFixed(1)}%</span> of {periodLabel.toLowerCase()}{' '}
          {mode === 'usd' ? 'returned below $1,000' : 'had negative returns'} — not displayed
        </div>
      )}
    </div>
  );
}
