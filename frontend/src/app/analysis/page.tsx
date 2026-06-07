"use client";

import * as React from "react";
import { AnalysisForm, AnalysisRequest } from "@/components/features/analysis-form";
import { DailyAnalysisForm, DailyAnalysisRequest } from "@/components/features/daily-analysis-form";
import { CumulativeTable, DiscreteTable, ExportRow, HistogramItem } from "@/components/features/histogram-charts";
import { FadeIn } from "@/components/ui/fade-in";
import { BarChart3, AlertCircle, Info, FileDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnalysisResultsTable, WeeklyResult } from "@/components/features/analysis-results-table";

interface AnalysisResponse {
  total_weeks: number;
  mean: number;
  median: number;
  p90: number;
  max: number;
  sharpe_ratio: number;
  calmar_ratio: number;
  max_drawdown: number;
  total_return: number;
  cumulative: HistogramItem[];
  discrete: HistogramItem[];
  results: WeeklyResult[];
}

type AnalysisMode = 'weekly' | 'daily';

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const ALL_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

function computeHistograms(results: WeeklyResult[], bucketSize = 100): { discrete: HistogramItem[]; cumulative: HistogramItem[] } {
  if (results.length === 0) return { discrete: [], cumulative: [] };
  const total = results.length;
  const clipped = results.map(r => Math.max(0, r.diff));

  // Discrete
  const bucketMap = new Map<number, number>();
  for (const d of clipped) {
    const b = Math.floor(d / bucketSize) * bucketSize;
    bucketMap.set(b, (bucketMap.get(b) ?? 0) + 1);
  }
  const discrete: HistogramItem[] = Array.from(bucketMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([b, count]) => ({
      label: `${b}-${b + bucketSize}`,
      value: (count / total) * 100,
      count,
    }));

  // Cumulative
  const maxVal = Math.max(...clipped, 0);
  const maxBucket = Math.floor(maxVal / bucketSize) * bucketSize;
  const cumulative: HistogramItem[] = [];
  for (let b = 0; b <= maxBucket + bucketSize; b += bucketSize) {
    const count = clipped.filter(d => d >= b).length;
    cumulative.push({ label: `≥ ${b}`, value: (count / total) * 100, count });
  }

  return { discrete, cumulative };
}

// Build an off-screen div with inline-only styles (no Tailwind) ready for html-to-image capture.
function buildExportSection(
  title: string,
  subtitle: string,
  headers: string[],
  colColors: string[],
  rows: ExportRow[],
  isDiscrete: boolean,
  mode: AnalysisMode = 'weekly',
): HTMLDivElement {
  const BG       = '#07111F';
  const BG_ROW1  = '#0F1B2D';
  const BG_ROW2  = '#0a1828';
  const BORDER   = '#1a2940';
  const TH_COLOR = '#4F5B70';
  const WHITE    = '#FFFFFF';
  const GREEN    = '#34D399';
  const BLUE     = '#60A5FA';
  const MUTED    = '#B6C2D1';

  const section = document.createElement('div');
  section.style.cssText = `background:${BG};padding:24px 28px;font-family:ui-monospace,monospace;`;

  // Title block
  const titleEl = document.createElement('div');
  titleEl.style.cssText = `margin-bottom:16px;`;

  const h = document.createElement('div');
  h.style.cssText = `color:${WHITE};font-size:15px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;`;
  h.textContent = title;

  const sub = document.createElement('div');
  sub.style.cssText = `color:${TH_COLOR};font-size:10px;`;
  sub.textContent = subtitle;

  titleEl.appendChild(h);
  titleEl.appendChild(sub);
  section.appendChild(titleEl);

  // Table wrapper
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = `border:1px solid ${BORDER};border-radius:8px;overflow:hidden;`;

  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:12px;`;

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.cssText = `background:${BG_ROW1};`;
  headers.forEach((hdr, i) => {
    const th = document.createElement('th');
    const isRight = i > 0;
    th.style.cssText = `
      padding:10px 14px;
      color:${colColors[i] ?? TH_COLOR};
      font-size:10px;font-weight:700;
      text-transform:uppercase;letter-spacing:0.06em;
      text-align:${isRight ? 'right' : 'left'};
      border-bottom:1px solid ${BORDER};
    `;
    th.textContent = hdr;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  rows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    tr.style.cssText = `background:${rowIdx % 2 === 0 ? BG_ROW1 : BG_ROW2};`;

    // Col 0: label
    const tdLabel = document.createElement('td');
    tdLabel.style.cssText = `padding:9px 14px;color:${WHITE};font-weight:700;`;
    tdLabel.textContent = row.label;
    tr.appendChild(tdLabel);

    // Col 1: count
    const tdCount = document.createElement('td');
    tdCount.style.cssText = `padding:9px 14px;color:${MUTED};text-align:right;`;
    tdCount.textContent = isDiscrete ? `${row.count}${mode === 'daily' ? 'd' : 'w'}` : String(row.count);
    tr.appendChild(tdCount);

    // Col 2: pct1 (green)
    const tdPct1 = document.createElement('td');
    tdPct1.style.cssText = `padding:9px 14px;color:${GREEN};font-weight:700;text-align:right;`;
    tdPct1.textContent = `${row.pct1.toFixed(1)}%`;
    tr.appendChild(tdPct1);

    // Col 3 (discrete only): pct2 (blue)
    if (isDiscrete && row.pct2 !== undefined) {
      const tdPct2 = document.createElement('td');
      tdPct2.style.cssText = `padding:9px 14px;color:${BLUE};text-align:right;`;
      tdPct2.textContent = `${row.pct2.toFixed(1)}%`;
      tr.appendChild(tdPct2);
    }

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  section.appendChild(tableWrap);

  return section;
}

export default function AnalysisPage() {
  const [mode, setMode] = React.useState<AnalysisMode>('weekly');
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const [selectedDays, setSelectedDays] = React.useState<Set<number>>(new Set(ALL_DAYS));

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    setAnalysisResult(null);
    setErrorMsg(null);
    setSelectedDays(new Set(ALL_DAYS));
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) { next.delete(day); } else { next.add(day); }
      return next;
    });
  };

  // Live export data — updated by each table via onExportData callback
  const discreteExport = React.useRef<{ rows: ExportRow[]; mode: 'usd' | 'pct'; title: string } | null>(null);
  const cumulativeExport = React.useRef<{ rows: ExportRow[]; mode: 'usd' | 'pct'; title: string } | null>(null);

  const runWeeklyAnalysis = async (request: AnalysisRequest) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const analysisRes = await apiFetch("/analysis/weekly-window", {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (!analysisRes.ok) {
        const detail = await analysisRes.json().catch(() => ({ detail: `HTTP ${analysisRes.status}` }));
        setErrorMsg(detail.detail || `Analysis failed (HTTP ${analysisRes.status})`);
        return;
      }
      const analysisData: AnalysisResponse = await analysisRes.json();
      setAnalysisResult(analysisData);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      setErrorMsg(`Request failed: ${msg}. Is the backend running?`);
    } finally {
      setLoading(false);
    }
  };

  const runDailyAnalysis = async (request: DailyAnalysisRequest) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const analysisRes = await apiFetch("/analysis/daily-window", {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (!analysisRes.ok) {
        const detail = await analysisRes.json().catch(() => ({ detail: `HTTP ${analysisRes.status}` }));
        setErrorMsg(detail.detail || `Analysis failed (HTTP ${analysisRes.status})`);
        return;
      }
      const analysisData: AnalysisResponse = await analysisRes.json();
      setAnalysisResult(analysisData);
      setSelectedDays(new Set(ALL_DAYS));
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      setErrorMsg(`Request failed: ${msg}. Is the backend running?`);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const dExp = discreteExport.current;
    const cExp = cumulativeExport.current;
    if (!dExp || !cExp) return;
    setExporting(true);
    try {
      const [{ toPng }, { default: jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;

      // Capture one section (fully inline-styled div) and paginate it
      const captureAndAppend = async (
        section: HTMLDivElement,
        isFirst: boolean,
      ) => {
        section.style.position = 'fixed';
        section.style.top = '0';
        section.style.left = '-9999px';
        section.style.width = '860px';
        document.body.appendChild(section);

        const dataUrl = await toPng(section, { pixelRatio: 2, backgroundColor: '#07111F' });
        document.body.removeChild(section);

        // Convert to canvas for slicing
        const img = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.src = dataUrl; });
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = img.naturalWidth;
        fullCanvas.height = img.naturalHeight;
        fullCanvas.getContext('2d')!.drawImage(img, 0, 0);

        const pxPerMm = fullCanvas.width / usableW;
        const pageHeightPx = Math.floor((pageH - margin * 2) * pxPerMm);

        let srcY = 0;
        let firstSlice = true;

        while (srcY < fullCanvas.height) {
          if (!firstSlice || !isFirst) {
            pdf.addPage();
            pdf.setFillColor(7, 17, 31);
            pdf.rect(0, 0, pageW, pageH, 'F');
          } else {
            pdf.setFillColor(7, 17, 31);
            pdf.rect(0, 0, pageW, pageH, 'F');
          }

          const slicePx = Math.min(pageHeightPx, fullCanvas.height - srcY);
          const sliceMm = slicePx / pxPerMm;

          const slice = document.createElement('canvas');
          slice.width = fullCanvas.width;
          slice.height = slicePx;
          slice.getContext('2d')!.drawImage(fullCanvas, 0, srcY, fullCanvas.width, slicePx, 0, 0, fullCanvas.width, slicePx);

          pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, usableW, sliceMm);

          srcY += slicePx;
          firstSlice = false;
        }
      };

      const periodSingular = mode === 'daily' ? 'Day' : 'Week';
      const periodPlural = mode === 'daily' ? 'Days' : 'Weeks';

      // Build discrete section
      const discreteSection = buildExportSection(
        `${periodSingular} Frequency`,
        `${dExp.mode === 'usd' ? 'USD return ranges' : '% return ranges'} — Cronograph Analysis`,
        dExp.mode === 'usd'
          ? ['Range', periodPlural, '% visible', '% all']
          : ['Range (%)', periodPlural, '% visible', '% all'],
        ['#4F5B70', '#4F5B70', '#34D399', '#60A5FA'],
        dExp.rows,
        true,
        mode,
      );

      const cumulativeSection = buildExportSection(
        'Return Distribution',
        `${cExp.mode === 'usd' ? 'Cumulative USD return' : 'Cumulative % return'} — Cronograph Analysis`,
        cExp.mode === 'usd'
          ? ['Return ≥', periodPlural, `% of ${periodPlural.toLowerCase()}`]
          : ['Return ≥ (%)', periodPlural, `% of ${periodPlural.toLowerCase()}`],
        ['#4F5B70', '#4F5B70', '#34D399'],
        cExp.rows,
        false,
        mode,
      );

      await captureAndAppend(discreteSection, true);
      await captureAndAppend(cumulativeSection, false);

      pdf.save('cronograph-analysis.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Filtered data for Daily mode weekday filter
  const displayResults = React.useMemo(() => {
    if (mode !== 'daily' || !analysisResult) return analysisResult?.results ?? [];
    return analysisResult.results.filter(r => selectedDays.has(new Date(r.entry_time).getDay()));
  }, [analysisResult, selectedDays, mode]);

  const { discrete: displayDiscrete, cumulative: displayCumulative } = React.useMemo(() => {
    if (!analysisResult) return { discrete: [], cumulative: [] };
    if (mode !== 'daily') return { discrete: analysisResult.discrete, cumulative: analysisResult.cumulative };
    return computeHistograms(displayResults);
  }, [analysisResult, displayResults, mode]);

  return (
    <div className="flex-1 p-8 xl:p-10 max-w-[1700px] mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1.5">Cronograph Analysis</h1>
          <p className="text-sm font-medium text-[#7C8BA1]">
            Statistical analysis of time windows and historical performance.
          </p>
        </div>
        <div className="flex gap-1 px-2 py-1.5 rounded-lg w-fit mt-1"
          style={{ border: '1px solid rgba(255,255,255,0.25)', backgroundColor: '#07111F' }}>
          <button
            onClick={() => handleModeChange('weekly')}
            className="px-3 py-1 rounded text-[11px] font-bold transition-colors"
            style={mode === 'weekly'
              ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' }
              : { color: '#7C8BA1' }}
          >
            Weekly
          </button>
          <button
            onClick={() => handleModeChange('daily')}
            className="px-3 py-1 rounded text-[11px] font-bold transition-colors"
            style={mode === 'daily'
              ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60A5FA' }
              : { color: '#7C8BA1' }}
          >
            Daily
          </button>
        </div>
      </div>

      {mode === 'weekly'
        ? <AnalysisForm onRun={runWeeklyAnalysis} loading={loading} />
        : <DailyAnalysisForm onRun={runDailyAnalysis} loading={loading} />
      }

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-0.5">Analysis failed</p>
            <p className="text-rose-300/80 text-xs">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white text-xs font-bold">✕</button>
        </div>
      )}

      {/* Weekday filter — Daily mode only */}
      {mode === 'daily' && analysisResult && (
        <div className="flex items-center gap-4 flex-wrap px-1">
          <span className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider shrink-0">Entry Days</span>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS.map(({ label, value }) => {
              const selected = selectedDays.has(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleDay(value)}
                  className="px-3 py-1.5 rounded-[6px] text-[11px] font-bold transition-colors"
                  style={selected
                    ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)' }
                    : { backgroundColor: 'transparent', color: '#4F5B70', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          {selectedDays.size < 7 && (
            <button
              onClick={() => setSelectedDays(new Set(ALL_DAYS))}
              className="text-[10px] font-bold text-[#7C8BA1] hover:text-white transition-colors ml-1"
            >
              Select all
            </button>
          )}
          <span className="text-[10px] text-[#4F5B70] ml-auto">
            {displayResults.length} of {analysisResult.results.length} days shown
          </span>
        </div>
      )}

      {analysisResult ? (
        <FadeIn className="space-y-8">
          {/* Row header + export button */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#4F5B70] uppercase tracking-wider">Distribution Tables</p>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}
            >
              <FileDown className="h-3.5 w-3.5" />
              {exporting ? 'Generating…' : 'Export PDF'}
            </button>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#7C8BA1]" />
                    {mode === 'daily' ? 'Day Frequency' : 'Week Frequency'}
                  </h3>
                  <p className="text-[10px] text-[#4F5B70] mt-1 ml-6">{mode === 'daily' ? 'days per return range' : 'weeks per return range'}</p>
                </div>
                <Info className="h-3.5 w-3.5 text-[#4F5B70]" />
              </div>
              <div className="p-6 h-[320px]">
                <DiscreteTable
                  data={displayDiscrete}
                  results={displayResults}
                  periodLabel={mode === 'daily' ? 'Days' : 'Weeks'}
                  onExportData={(rows, exportMode, title) => {
                    discreteExport.current = { rows, mode: exportMode, title };
                  }}
                />
              </div>
            </div>

            <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#3B82F6]" />
                  Return Distribution
                </h3>
                <Info className="h-3.5 w-3.5 text-[#4F5B70]" />
              </div>
              <div className="p-6 h-[320px]">
                <CumulativeTable
                  data={displayCumulative}
                  results={displayResults}
                  periodLabel={mode === 'daily' ? 'days' : 'weeks'}
                  onExportData={(rows, exportMode, title) => {
                    cumulativeExport.current = { rows, mode: exportMode, title };
                  }}
                />
              </div>
            </div>
          </div>

          <AnalysisResultsTable results={displayResults} mode={mode} />
        </FadeIn>
      ) : (
        !loading && (
          <FadeIn>
            <div className="h-[500px] flex flex-col items-center justify-center p-20 rounded-[24px] border-2 border-dashed border-white/5 bg-[#0F1B2D]/50 text-[#7C8BA1] shadow-inner">
              <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                <Info className="h-8 w-8 text-[#3B82F6]" />
              </div>
              <p className="text-xl font-bold text-white mb-2 tracking-tight">Ready for Research</p>
              <p className="text-sm font-medium text-center max-w-[320px] leading-relaxed">
                Configure your entry/exit parameters and run the analysis engine to view statistical distributions.
              </p>
            </div>
          </FadeIn>
        )
      )}
    </div>
  );
}
