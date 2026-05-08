"use client";

import * as React from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface WeeklyResult {
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  diff: number;
  return_pct: number;
}

interface Props {
  results: WeeklyResult[];
}

export function AnalysisResultsTable({ results }: Props) {
  return (
    <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Trade Journal (Weekly Windows)
        </h3>
        <span className="text-xs font-bold text-[#4F5B70]">{results.length} trades</span>
      </div>

      <div className="overflow-auto max-h-[520px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0F1B2D] z-10">
            <tr className="border-b border-white/5">
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase">#</th>
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase">Entry Date</th>
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase">Entry Price</th>
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase">Exit Date</th>
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase">Exit Price</th>
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase text-right">Points Diff</th>
              <th className="px-5 py-3.5 text-[13px] font-bold text-[#4F5B70] uppercase text-right">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            <AnimatePresence mode="popLayout">
              {results.map((result, idx) => {
                const isPositive = result.return_pct > 0;
                const diff = result.diff ?? (result.exit_price - result.entry_price);
                const isDiffPositive = diff >= 0;

                return (
                  <motion.tr
                    key={`${result.entry_time}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-[15px] font-medium text-[#4F5B70]">{idx + 1}</td>
                    <td className="px-5 py-3.5 text-[15px] font-bold text-white">
                      {format(new Date(result.entry_time), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] font-mono text-[#B6C2D1]">
                      ${result.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] font-bold text-white">
                      {format(new Date(result.exit_time), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] font-mono text-[#B6C2D1]">
                      ${result.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-[15px] font-mono font-bold text-right",
                      isDiffPositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-[15px] font-bold text-right font-mono",
                      isPositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {isPositive ? "+" : ""}{result.return_pct.toFixed(2)}%
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

    </div>
  );
}
