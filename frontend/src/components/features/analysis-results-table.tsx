"use client";

import * as React from "react";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Calendar, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WeeklyResult {
  entry_time: string;
  exit_time: string;
  open_entry: number;
  close_exit: number;
  diff: number;
  pct_change: number;
}

interface Props {
  results: WeeklyResult[];
}

export function AnalysisResultsTable({ results }: Props) {
  return (
    <Card className="overflow-hidden border-muted/40 shadow-sm bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Trade Journal
            </CardTitle>
            <CardDescription>
              Detailed week-by-week breakdown of the analyzed window.
            </CardDescription>
          </div>
          <Badge variant="outline" className="h-6 font-medium">
            {results.length} Weeks
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto rounded-xl border border-muted/50">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 font-semibold">Period</th>
                <th className="px-6 py-4 font-semibold">Entry Price</th>
                <th className="px-6 py-4 font-semibold">Exit Price</th>
                <th className="px-6 py-4 font-semibold text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/40">
              <AnimatePresence mode="popLayout">
                {results.map((result, idx) => {
                  const isPositive = result.diff > 0;
                  const isNegative = result.diff < 0;
                  
                  return (
                    <motion.tr
                      key={`${result.entry_time}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(result.entry_time), "MMM dd, HH:mm")}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{format(new Date(result.exit_time), "MMM dd, HH:mm")}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        ${result.open_entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        ${result.close_exit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <div className={cn(
                            "flex items-center gap-1 font-bold",
                            isPositive ? "text-emerald-500" : isNegative ? "text-rose-500" : "text-muted-foreground"
                          )}>
                            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : isNegative ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
                            ${Math.abs(result.diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className={cn(
                            "text-[10px] font-medium",
                            isPositive ? "text-emerald-500/70" : isNegative ? "text-rose-500/70" : "text-muted-foreground/70"
                          )}>
                            {isPositive ? "+" : ""}{result.pct_change}%
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
