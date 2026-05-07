"use client";

import * as React from "react";
import { SymbolSearch } from "./symbol-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getExtractionPreview, startExtraction, ExtractionEstimate } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ExtractionProgress } from "./extraction-progress";

export function ExtractionForm() {
  const [symbol, setSymbol] = React.useState("");
  const [interval, setInterval] = React.useState("1h");
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [estimate, setEstimate] = React.useState<ExtractionEstimate | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);

  const handlePreview = async () => {
    if (!symbol || !rangeFrom || !rangeTo) return;
    setLoading(true);
    try {
      const result = await getExtractionPreview({
        symbol,
        interval,
        range_from: new Date(rangeFrom).toISOString(),
        range_to: new Date(rangeTo).toISOString(),
      });
      setEstimate(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!symbol || !rangeFrom || !rangeTo) return;
    setLoading(true);
    try {
      const { job_id } = await startExtraction({
        symbol,
        interval,
        range_from: new Date(rangeFrom).toISOString(),
        range_to: new Date(rangeTo).toISOString(),
      });
      setJobId(job_id);
      // Here we would normally redirect or show progress
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Extract Market Data</CardTitle>
        <CardDescription>
          Download OHLCV data from Binance to your local database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Symbol</Label>
          <SymbolSearch value={symbol} onChange={setSymbol} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Interval</Label>
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            >
              <option value="1m">1 minute</option>
              <option value="1h">1 hour</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Input 
              type="datetime-local" 
              value={rangeFrom} 
              onChange={(e) => setRangeFrom(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input 
              type="datetime-local" 
              value={rangeTo} 
              onChange={(e) => setRangeTo(e.target.value)} 
            />
          </div>
        </div>

        {estimate && (
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Estimated Candles</span>
              <Badge variant="secondary">{estimate.candles_total.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Requests</span>
              <Badge variant="secondary">{estimate.requests_total}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">ETA</span>
              <Badge variant="secondary">{estimate.eta_seconds}s</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Estimated Size</span>
              <Badge variant="secondary">{estimate.mb_estimate} MB</Badge>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={handlePreview}
          disabled={loading || !symbol || !rangeFrom || !rangeTo}
        >
          Estimate
        </Button>
        <Button 
          className="flex-1" 
          onClick={handleStart}
          disabled={loading || !symbol || !rangeFrom || !rangeTo}
        >
          {loading ? "Starting..." : "Start Extraction"}
        </Button>
      </CardFooter>
      
      {jobId && (
        <div className="p-6 border-t bg-muted/30">
          <ExtractionProgress jobId={jobId} />
        </div>
      )}
    </Card>
  );
}
