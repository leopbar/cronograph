"use client";

import * as React from "react";
import { ExtractionForm } from "@/components/features/extraction-form";
import { AnalysisForm, AnalysisRequest } from "@/components/features/analysis-form";
import { CumulativeHistogram, DiscreteHistogram, HistogramItem } from "@/components/features/histogram-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/fade-in";
import { Database, BarChart3, Info } from "lucide-react";

interface AnalysisResponse {
  total_weeks: number;
  mean: number;
  median: number;
  p90: number;
  max: number;
  cumulative: HistogramItem[];
  discrete: HistogramItem[];
}

export default function Home() {
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  const runAnalysis = async (request: AnalysisRequest) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/analysis/weekly-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = await response.json();
        alert(error.detail || "Analysis failed");
        return;
      }
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error(error);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="flex-1 container py-10 px-4">
      <FadeIn>
        <div className="flex flex-col items-center mb-10 text-center">
          <Badge variant="outline" className="mb-4">MVP Release</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Market Engine</h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            High-performance quantitative analysis for crypto assets. 
            Extract data and run statistical windows in seconds.
          </p>
        </div>
      </FadeIn>

      <Tabs defaultValue="extract" className="w-full">
        <FadeIn delay={0.1}>
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="extract" className="gap-2">
                <Database className="h-4 w-4" />
                Extraction
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analysis
              </TabsTrigger>
            </TabsList>
          </div>
        </FadeIn>

        <TabsContent value="extract">
          <FadeIn delay={0.2}>
            <ExtractionForm />
          </FadeIn>
        </TabsContent>

        <TabsContent value="analyze" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <FadeIn delay={0.2} className="lg:col-span-1">
              <AnalysisForm onRun={runAnalysis} loading={loading} />
            </FadeIn>
            
            <div className="lg:col-span-2 space-y-8">
              {analysisResult && (
                <FadeIn delay={0.3}>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <StatCard label="Total Weeks" value={analysisResult.total_weeks} />
                      <StatCard label="Mean" value={analysisResult.mean} />
                      <StatCard label="Median" value={analysisResult.median} />
                      <StatCard label="P90" value={analysisResult.p90} />
                      <StatCard label="Max" value={analysisResult.max} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <Card className="overflow-hidden border-muted/40 shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Cumulative Distribution (%)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <CumulativeHistogram data={analysisResult.cumulative} />
                        </CardContent>
                      </Card>
                      
                      <Card className="overflow-hidden border-muted/40 shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-secondary-foreground" />
                            Discrete Distribution (%)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <DiscreteHistogram data={analysisResult.discrete} />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </FadeIn>
              )}
              {!analysisResult && !loading && (
                <FadeIn delay={0.3}>
                  <Card className="h-[500px] flex flex-col items-center justify-center p-20 text-muted-foreground border-dashed bg-muted/5">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Info className="h-6 w-6" />
                    </div>
                    <p className="font-medium text-foreground mb-1">No Analysis Data</p>
                    <p className="text-sm text-center max-w-[250px]">
                      Select a symbol and define your entry/exit window to see the statistical results.
                    </p>
                  </Card>
                </FadeIn>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

