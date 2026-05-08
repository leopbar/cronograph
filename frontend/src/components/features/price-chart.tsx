"use client";

import * as React from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  CandlestickData,
  CandlestickSeries,
  Time,
  createSeriesMarkers,
  SeriesMarker,
} from "lightweight-charts";

interface PriceChartProps {
  data: CandlestickData[];
  markers?: SeriesMarker<Time>[];
}

export function PriceChart({ data, markers = [] }: PriceChartProps) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<IChartApi | null>(null);
  const seriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = React.useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  React.useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7C8BA1",
      },
      grid: {
        vertLines: { color: "#1A2940" },
        horzLines: { color: "#1A2940" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: "#1A2940",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    series.setData(data);
    chart.timeScale().fitContent();
  }, [data]);

  React.useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (markersRef.current) {
      markersRef.current.setMarkers(markers);
    } else if (markers.length > 0) {
      markersRef.current = createSeriesMarkers(series, markers);
    }
  }, [markers]);

  return (
    <div className="w-full h-full min-h-[400px]" ref={chartContainerRef} />
  );
}
