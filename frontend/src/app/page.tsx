"use client";

import * as React from "react";
import { ExtractionForm } from "@/components/features/extraction-form";
import { ExtractionProgress } from "@/components/features/extraction-progress";
import { ExtractionCompleted } from "@/components/features/extraction-completed";
import { FadeIn } from "@/components/ui/fade-in";

type ExtractionState = "idle" | "running" | "completed";

interface CompletedData {
  recordsExtracted: number;
  startDate: string;
  endDate: string;
  duration: string;
  speed: number;
}

function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export default function ExtractionPage() {
  const [extractionState, setExtractionState] = React.useState<ExtractionState>("idle");
  const [currentJobId, setCurrentJobId] = React.useState<string | null>(null);
  const [completedData, setCompletedData] = React.useState<CompletedData | null>(null);
  const jobDates = React.useRef<{ rangeFrom: string; rangeTo: string }>({ rangeFrom: "", rangeTo: "" });

  const handleStartExtraction = (jobId: string, rangeFrom: string, rangeTo: string) => {
    jobDates.current = { rangeFrom, rangeTo };
    setCurrentJobId(jobId);
    setExtractionState("running");
  };

  const handleExtractionComplete = (stats: { recordsExtracted: number; duration: string; speed: number }) => {
    setCompletedData({
      recordsExtracted: stats.recordsExtracted,
      startDate: formatDisplayDate(jobDates.current.rangeFrom),
      endDate: formatDisplayDate(jobDates.current.rangeTo),
      duration: stats.duration,
      speed: stats.speed,
    });
    setExtractionState("completed");
  };

  return (
    <div className="flex-1 p-12 max-w-[1400px] mx-auto w-full">
      <div className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-[42px] font-bold tracking-tight text-white leading-[1.1] mb-3">
            Crypto Data Extraction
          </h1>
          <p className="text-[16px] font-medium text-[#B6C2D1]">
            Extract historical cryptocurrency market data quickly and securely.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <FadeIn delay={0.1}>
          <ExtractionForm 
            onStart={handleStartExtraction} 
            disabled={extractionState === "running"} 
          />
        </FadeIn>

        {extractionState === "running" && currentJobId && (
          <FadeIn delay={0.2}>
            <ExtractionProgress 
              jobId={currentJobId} 
              onComplete={handleExtractionComplete} 
            />
          </FadeIn>
        )}

        {extractionState === "completed" && completedData && (
          <FadeIn delay={0.2}>
            <ExtractionCompleted
              recordsExtracted={completedData.recordsExtracted}
              startDate={completedData.startDate}
              endDate={completedData.endDate}
              duration={completedData.duration}
              speed={completedData.speed}
            />
          </FadeIn>
        )}
        
        {/* Placeholders removed as per user request */}
      </div>
    </div>
  );
}

