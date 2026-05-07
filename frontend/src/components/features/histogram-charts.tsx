"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface HistogramItem {
  label: string;
  value: number;
  count: number;
}

export function CumulativeHistogram({ data }: { data: HistogramItem[] }) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
          <XAxis type="number" unit="%" domain={[0, 100]} />
          <YAxis type="category" dataKey="label" width={80} fontSize={12} />
          <Tooltip 
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background border p-2 rounded-lg shadow-sm text-xs">
                    <p className="font-bold">{payload[0].payload.label}</p>
                    <p className="text-muted-foreground">{payload[0].value}% of weeks</p>
                    <p className="text-muted-foreground">{payload[0].payload.count} weeks</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DiscreteHistogram({ data }: { data: HistogramItem[] }) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis 
            dataKey="label" 
            angle={-45} 
            textAnchor="end" 
            height={60} 
            fontSize={10}
          />
          <YAxis unit="%" />
          <Tooltip 
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background border p-2 rounded-lg shadow-sm text-xs">
                    <p className="font-bold">Range: {payload[0].payload.label}</p>
                    <p className="text-muted-foreground">{payload[0].value}% of weeks</p>
                    <p className="text-muted-foreground">{payload[0].payload.count} weeks</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
