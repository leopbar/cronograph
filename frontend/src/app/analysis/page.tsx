"use client";

import * as React from "react";
import { AnalysisForm, AnalysisRequest } from "@/components/features/analysis-form";
import { CumulativeHistogram, DiscreteHistogram, HistogramItem } from "@/components/features/histogram-charts";
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

export default function AnalysisPage() {
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const runAnalysis = async (request: AnalysisRequest) => {
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

  return (
    <div className="flex-1 p-8 xl:p-10 max-w-[1700px] mx-auto w-full space-y-8">
      {/* Header Area */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1.5">Cronograph Analysis</h1>
          <p className="text-sm font-medium text-[#7C8BA1]">
            Statistical analysis of time windows and historical performance.
          </p>
        </div>
      </div>

      {/* Parameters Bar */}
      <AnalysisForm onRun={runAnalysis} loading={loading} />

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold mb-0.5">Analysis failed</p>
            <p className="text-rose-300/80 text-xs">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-300 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {analysisResult ? (
        <FadeIn className="space-y-8">
          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Discrete Returns */}
            <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#7C8BA1]" />
                    Week Frequency
                  </h3>
                  <p className="text-[10px] text-[#4F5B70] mt-1 ml-6">weeks per return range (USD)</p>
                </div>
                <Info className="h-3.5 w-3.5 text-[#4F5B70]" />
              </div>
              <div className="p-6 h-[320px]">
                <DiscreteHistogram data={analysisResult.discrete} />
              </div>
            </div>

            {/* Return Distribution */}
            <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#3B82F6]" />
                  Return Distribution
                </h3>
                <Info className="h-3.5 w-3.5 text-[#4F5B70]" />
              </div>
              <div className="p-6 h-[320px]">
                <CumulativeHistogram data={analysisResult.cumulative} />
              </div>
            </div>
          </div>

          {/* Trade Journal */}
          <AnalysisResultsTable results={analysisResult.results} />
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
