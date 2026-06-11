"use client";

import * as React from "react";
import { AnalysisForm, AnalysisRequest } from "@/components/features/analysis-form";
import { DailyAnalysisForm, DailyAnalysisRequest } from "@/components/features/daily-analysis-form";
import { CumulativeTable, HistogramItem } from "@/components/features/histogram-charts";
import { FadeIn } from "@/components/ui/fade-in";
import { BarChart3, AlertCircle, Info } from "lucide-react";
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

export default function AnalysisPage() {
  const [mode, setMode] = React.useState<AnalysisMode>('weekly');
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

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


  // Filtered data for Daily mode weekday filter
  const displayResults = React.useMemo(() => {
    if (mode !== 'daily' || !analysisResult) return analysisResult?.results ?? [];
    return analysisResult.results.filter(r => selectedDays.has(new Date(r.entry_time).getDay()));
  }, [analysisResult, selectedDays, mode]);

  const displayCumulative = React.useMemo(() => {
    if (!analysisResult) return [];
    if (mode !== 'daily') return analysisResult.cumulative;
    return computeHistograms(displayResults).cumulative;
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
          {selectedDays.size > 0 && (
            <button
              onClick={() => setSelectedDays(new Set())}
              className="text-[10px] font-bold text-[#7C8BA1] hover:text-rose-400 transition-colors"
            >
              Deselect all
            </button>
          )}
          <span className="text-[10px] text-[#4F5B70] ml-auto">
            {displayResults.length} of {analysisResult.results.length} days shown
          </span>
        </div>
      )}

      {analysisResult ? (
        <FadeIn className="space-y-8">
          {/* Row header */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#4F5B70] uppercase tracking-wider">Distribution Tables</p>
          </div>

          {/* Table */}
          <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#3B82F6]" />
                Return Distribution
              </h3>
              <Info className="h-3.5 w-3.5 text-[#4F5B70]" />
            </div>
            <div className="p-6 h-[480px]">
              <CumulativeTable
                data={displayCumulative}
                results={displayResults}
                periodLabel={mode === 'daily' ? 'days' : 'weeks'}
              />
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
