"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

export interface DailyAnalysisRequest {
  symbol: string;
  interval: string;
  range_from: string;
  range_to: string;
  entry_time: string;
  entry_price_type: string;
}

interface DailyAnalysisFormProps {
  onRun: (request: DailyAnalysisRequest) => void;
  loading: boolean;
}

type SymbolsState =
  | { status: "loading" }
  | { status: "ready"; list: string[] }
  | { status: "empty" }
  | { status: "error"; message: string };

export function DailyAnalysisForm({ onRun, loading }: DailyAnalysisFormProps) {
  const [symbol, setSymbol] = React.useState("");
  const [symbolsState, setSymbolsState] = React.useState<SymbolsState>({ status: "loading" });
  const [interval, setInterval] = React.useState("1h");
  const [rangeFrom, setRangeFrom] = React.useState("2024-01-01");
  const [rangeTo, setRangeTo] = React.useState(new Date().toISOString().split('T')[0]);
  const [entryTime, setEntryTime] = React.useState("14:00");

  const inputClasses = "flex h-[42px] w-full rounded-[8px] border border-white/10 bg-[#07111F] px-3 py-2 text-xs text-white placeholder:text-[#7C8BA1] focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all duration-200";

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSymbolsState({ status: "loading" });
        const response = await apiFetch("/extractions/symbols");
        if (cancelled) return;
        if (!response.ok) {
          setSymbolsState({ status: "error", message: `HTTP ${response.status}` });
          return;
        }
        const data: string[] = await response.json();
        if (cancelled) return;
        if (data.length === 0) {
          setSymbolsState({ status: "empty" });
        } else {
          setSymbolsState({ status: "ready", list: data });
          setSymbol((prev) => prev || data[0]);
        }
      } catch (err) {
        if (cancelled) return;
        setSymbolsState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const symbols = symbolsState.status === "ready" ? symbolsState.list : [];

  const handleSubmit = () => {
    onRun({
      symbol,
      interval,
      range_from: rangeFrom,
      range_to: rangeTo,
      entry_time: entryTime,
      entry_price_type: "open",
    });
  };

  return (
    <div className="rounded-[12px] border border-white/5 bg-[#0F1B2D] shadow-xl p-6 mb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-end">

        {/* Asset */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider ml-1">Asset</label>
          <div className="relative">
            <select
              className={cn(inputClasses, "appearance-none pr-8")}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              disabled={symbolsState.status !== "ready"}
            >
              {symbolsState.status === "loading" && <option value="">Loading…</option>}
              {symbolsState.status === "empty" && <option value="">No data extracted yet</option>}
              {symbolsState.status === "error" && <option value="">Error: {symbolsState.message}</option>}
              {symbolsState.status === "ready" && symbols.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {symbolsState.status === "empty" && (
            <p className="text-[10px] font-medium text-amber-400/80 ml-1 mt-1">
              Extract data first on the Extract Data page.
            </p>
          )}
        </div>

        {/* Interval */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider ml-1">Data Interval</label>
          <select
            className={cn(inputClasses, "appearance-none")}
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          >
            <option value="1m">1 Minute</option>
            <option value="1h">1 Hour</option>
          </select>
        </div>

        {/* Range From */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider ml-1">Range From</label>
          <input
            type="date"
            className={cn(inputClasses, "bg-[#07111F] px-2")}
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
          />
        </div>

        {/* Range To */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider ml-1">Range To</label>
          <input
            type="date"
            className={cn(inputClasses, "bg-[#07111F] px-2")}
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
          />
        </div>
      </div>

      <div className="h-px bg-white/5 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        {/* Entry Time */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider ml-1">Entry Time</label>
          <input
            type="time"
            className={cn(inputClasses, "bg-[#07111F] text-center px-2")}
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
          />
        </div>

        {/* Exit Time (fixed) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#7C8BA1] uppercase tracking-wider ml-1">Exit Time</label>
          <div className={cn(inputClasses, "items-center flex opacity-50 cursor-not-allowed")}>
            <span>07:00</span>
            <span className="ml-2 text-[10px] text-[#7C8BA1]">(fixed — next day)</span>
          </div>
        </div>

        {/* Run Analysis */}
        <div className="flex-none pt-4 md:pt-0">
          <button
            onClick={handleSubmit}
            disabled={loading || !symbol}
            className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] btn-success text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 8L1 15V1Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}
