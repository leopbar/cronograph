"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface ProgressData {
  progress: number;
  candles_done: number;
  candles_total?: number;
  status: string;
  error?: string;
}

export function ExtractionProgress({ jobId }: { jobId: string }) {
  const [data, setData] = React.useState<ProgressData | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  React.useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/extractions/${jobId}/stream`);

    eventSource.addEventListener("progress", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data);
      setData(prev => ({
        ...prev,
        progress: parsed.progress,
        candles_done: parsed.candles_done,
        status: "running"
      } as ProgressData));
    });

    eventSource.addEventListener("done", () => {
      setData(prev => ({ ...prev, status: "done", progress: 1 } as ProgressData));
      window.dispatchEvent(new CustomEvent("refresh-history"));
      eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
      setData(prev => ({ ...prev, status: "failed", error: JSON.parse((event as MessageEvent).data) } as ProgressData));
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, API_URL]);

  if (!data) return <p className="text-center text-sm text-muted-foreground">Connecting to stream...</p>;

  const progressPercent = data ? Math.round(data.progress * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium uppercase tracking-wider">Status: {data?.status || "Connecting..."}</span>
        <span className="text-sm font-medium">{progressPercent}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{(data?.candles_done || 0).toLocaleString()} candles done</span>
      </div>
      {data?.error && (
        <Badge variant="destructive" className="w-full justify-center">
          Error: {data.error}
        </Badge>
      )}
    </div>
  );
}
