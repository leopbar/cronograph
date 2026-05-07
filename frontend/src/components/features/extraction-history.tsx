"use client";

import * as React from "react";
import { format } from "date-fns";
import { Database, Calendar, Activity, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCoverageHistory, Coverage } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ExtractionHistory() {
  const [history, setHistory] = React.useState<Coverage[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refreshHistory = React.useCallback(async () => {
    try {
      const data = await getCoverageHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;
    const fetchHistory = async () => {
      if (!ignore) {
        await refreshHistory();
      }
    };
    fetchHistory();
    return () => {
      ignore = true;
    };
  }, [refreshHistory]);

  React.useEffect(() => {
    const handleRefresh = () => refreshHistory();
    window.addEventListener("refresh-history", handleRefresh);
    return () => window.removeEventListener("refresh-history", handleRefresh);
  }, [refreshHistory]);

  return (
    <Card className="overflow-hidden border-muted/40 shadow-sm bg-background/50 backdrop-blur-sm max-w-4xl mx-auto w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Data Vault
            </CardTitle>
            <CardDescription>
              Historical market data currently stored in your database.
            </CardDescription>
          </div>
          <Badge variant="outline" className="h-6 gap-1 font-medium bg-primary/5 border-primary/20 text-primary">
            <Activity className="h-3 w-3" />
            {history.length} Assets
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">Scanning database...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
            <Database className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Your Data Vault is empty.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Start an extraction to see it here.</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto rounded-xl border border-muted/50">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-semibold">Symbol</th>
                  <th className="px-6 py-4 font-semibold">Interval</th>
                  <th className="px-6 py-4 font-semibold">Time Coverage</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/40">
                <AnimatePresence mode="popLayout">
                  {history.map((item, idx) => (
                    <motion.tr
                      key={`${item.symbol}-${item.range_from}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {item.symbol.substring(0, 1)}
                          </div>
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-mono text-[10px] h-5 bg-secondary/50">
                          {item.interval}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {format(new Date(item.range_from), "MMM dd, yyyy")}
                          </span>
                          <ChevronRight className="h-3 w-3 opacity-30" />
                          <span className="text-xs">
                            {format(new Date(item.range_to), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          Ready
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
