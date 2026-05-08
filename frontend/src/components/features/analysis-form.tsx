"use client";

import * as React from "react";
import { SymbolSearch } from "./symbol-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnalysisRequest {
  symbol: string;
  interval: string;
  entry_weekday: number;
  entry_time: string;
  entry_price_type: string;
  exit_weekday: number;
  exit_time: string;
  exit_price_type: string;
  bucket_size: number;
}

interface AnalysisFormProps {
  onRun: (request: AnalysisRequest) => void;
  loading: boolean;
}

export function AnalysisForm({ onRun, loading }: AnalysisFormProps) {
  const [symbol, setSymbol] = React.useState("");
  const [interval, setInterval] = React.useState("1h");
  const [entryWeekday, setEntryWeekday] = React.useState("0");
  const [entryTime, setEntryTime] = React.useState("14:00");
  const [entryPriceType, setEntryPriceType] = React.useState("open");
  const [exitWeekday, setExitWeekday] = React.useState("4");
  const [exitTime, setExitTime] = React.useState("07:00");
  const [exitPriceType, setExitPriceType] = React.useState("open");
  const [bucketSize, setBucketSize] = React.useState("1000");

  const handleSubmit = () => {
    onRun({
      symbol,
      interval,
      entry_weekday: parseInt(entryWeekday),
      entry_time: entryTime,
      entry_price_type: entryPriceType,
      exit_weekday: parseInt(exitWeekday),
      exit_time: exitTime,
      exit_price_type: exitPriceType,
      bucket_size: parseInt(bucketSize),
    });
  };

  const weekdays = [
    { value: "0", label: "Monday" },
    { value: "1", label: "Tuesday" },
    { value: "2", label: "Wednesday" },
    { value: "3", label: "Thursday" },
    { value: "4", label: "Friday" },
    { value: "5", label: "Saturday" },
    { value: "6", label: "Sunday" },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analysis Parameters</CardTitle>
        <CardDescription>Define your entry and exit windows for statistical analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Symbol</Label>
          <SymbolSearch value={symbol} onChange={setSymbol} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4 border-r pr-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Entry</h3>
            <div className="space-y-2">
              <Label>Weekday</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={entryWeekday}
                onChange={(e) => setEntryWeekday(e.target.value)}
              >
                {weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Time (UTC)</Label>
              <Input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={entryPriceType}
                onChange={(e) => setEntryPriceType(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="close">Close</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exit</h3>
            <div className="space-y-2">
              <Label>Weekday</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={exitWeekday}
                onChange={(e) => setExitWeekday(e.target.value)}
              >
                {weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Time (UTC)</Label>
              <Input type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={exitPriceType}
                onChange={(e) => setExitPriceType(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="close">Close</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Interval</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            >
              <option value="1m">1m</option>
              <option value="1h">1h</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Bucket Size (Points)</Label>
            <Input type="number" value={bucketSize} onChange={(e) => setBucketSize(e.target.value)} />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={loading || !symbol}>
          {loading ? "Analyzing..." : "Run Weekly Analysis"}
        </Button>
      </CardFooter>
    </Card>
  );
}
