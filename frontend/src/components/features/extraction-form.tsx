"use client";

import * as React from "react";
import { SymbolSearch } from "./symbol-search";
import { startExtraction } from "@/lib/api";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onStart: (jobId: string, rangeFrom: string, rangeTo: string) => void;
  disabled?: boolean;
}

export function ExtractionForm({ onStart, disabled }: Props) {
  const [symbol, setSymbol] = React.useState("BTCUSDT");
  const [interval, setInterval] = React.useState("1m");
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleStart = async () => {
    if (!symbol || !rangeFrom || !rangeTo) return;
    setLoading(true);
    try {
      const { job_id } = await startExtraction({
        symbol,
        interval,
        range_from: new Date(`${rangeFrom}T00:00:00`).toISOString(),
        range_to: new Date(`${rangeTo}T23:59:59`).toISOString(),
      });
      onStart(job_id, rangeFrom, rangeTo);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "flex h-[52px] w-full rounded-[12px] border border-white/10 bg-[#0F1B2D] px-4 py-2 text-sm text-white placeholder:text-[#7C8BA1] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200";

  return (
    <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-2xl overflow-hidden">
      <div className="px-8 py-5 border-b border-white/5">
        <h2 className="text-xl font-bold text-white tracking-tight">Extraction Settings</h2>
      </div>
      
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-6 items-end">
          
          <div className="w-full space-y-2.5">
            <label className="text-sm font-semibold text-[#B6C2D1] ml-1">Symbol</label>
            <SymbolSearch 
              value={symbol} 
              onChange={setSymbol} 
              className={cn(inputClasses, "border-white/10")} 
            />
            <p className="text-[12px] font-medium text-[#7C8BA1] ml-1">BTC, ETH or OTHERS</p>
          </div>

          <div className="w-full space-y-2.5">
            <label className="text-sm font-semibold text-[#B6C2D1] ml-1">Interval</label>
            <select 
              className={cn(inputClasses, "appearance-none")}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              disabled={disabled}
            >
              <option value="1m">1 Minute</option>
              <option value="1h">1 Hour</option>
            </select>
            <p className="text-[12px] font-medium text-[#7C8BA1] ml-1">1 Minute or 1 Hour</p>
          </div>

          <div className="w-full space-y-2.5">
            <label className="text-sm font-semibold text-[#B6C2D1] ml-1">Start Date</label>
            <div className="relative">
              <input 
                type="date" 
                className={inputClasses}
                value={rangeFrom} 
                onChange={(e) => setRangeFrom(e.target.value)}
                disabled={disabled}
              />
            </div>
            <p className="text-[12px] font-medium text-[#7C8BA1] ml-1 opacity-0 select-none">Spacer</p>
          </div>

          <div className="w-full space-y-2.5">
            <label className="text-sm font-semibold text-[#B6C2D1] ml-1">End Date</label>
            <div className="relative">
              <input 
                type="date" 
                className={inputClasses}
                value={rangeTo} 
                onChange={(e) => setRangeTo(e.target.value)}
                disabled={disabled}
              />
            </div>
            <p className="text-[12px] font-medium text-[#7C8BA1] ml-1 opacity-0 select-none">Spacer</p>
          </div>

          <div className="w-full space-y-2.5 mt-4 xl:mt-0">
            <label className="text-sm font-semibold ml-1 opacity-0 select-none hidden xl:block">Action</label>
            <button
              onClick={handleStart}
              disabled={disabled || loading || !symbol || !rangeFrom || !rangeTo}
              className="flex h-[52px] w-full xl:w-[180px] items-center justify-center gap-3 rounded-[12px] btn-success px-4 text-[15px] font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Play className="h-5 w-5 fill-white shrink-0" />
              {loading ? "Starting..." : "Start Extraction"}
            </button>
            <p className="text-[12px] font-medium ml-1 opacity-0 select-none hidden xl:block">Spacer</p>
          </div>

        </div>
      </div>
    </div>
  );
}

