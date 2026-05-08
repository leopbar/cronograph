"use client";

import * as React from "react";
import { ExtractionForm } from "@/components/features/extraction-form";
import { ExtractionProgress } from "@/components/features/extraction-progress";
import { ExtractionCompleted } from "@/components/features/extraction-completed";
import { FadeIn } from "@/components/ui/fade-in";

type ExtractionState = "idle" | "running" | "completed";

export default function ExtractionPage() {
  const [extractionState, setExtractionState] = React.useState<ExtractionState>("idle");
  const [currentJobId, setCurrentJobId] = React.useState<string | null>(null);

  const handleStartExtraction = (jobId: string) => {
    setCurrentJobId(jobId);
    setExtractionState("running");
  };

  const handleExtractionComplete = () => {
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

        {extractionState === "completed" && (
          <FadeIn delay={0.2}>
            <ExtractionCompleted />
          </FadeIn>
        )}
        
        {/* Placeholders removed as per user request */}
      </div>
    </div>
  );
}

