"use client";

import { CheckCircle2, Database, Calendar, Clock, Gauge } from "lucide-react";

interface Props {
  recordsExtracted?: number;
  startDate?: string;
  endDate?: string;
  duration?: string;
  speed?: number;
}

export function ExtractionCompleted({
  recordsExtracted = 0,
  startDate = "—",
  endDate = "—",
  duration = "00:00:00",
  speed = 0
}: Props) {
  return (
    <div className="rounded-[16px] border border-[#22C55E]/20 bg-[#0F1B2D] shadow-2xl overflow-hidden relative">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#22C55E]/30" />
      
      <div className="p-8 space-y-8">
        
        {/* Header Success */}
        <div className="flex items-start gap-6">
          <div className="h-16 w-16 rounded-full border-4 border-[#22C55E]/10 bg-[#22C55E]/5 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <CheckCircle2 className="h-9 w-9 text-[#22C55E]" />
          </div>
          <div className="pt-1">
            <h3 className="text-2xl font-bold text-[#22C55E] tracking-tight">Extraction Completed Successfully!</h3>
            <p className="text-base font-medium text-[#B6C2D1] mt-1.5">Your data has been extracted and is ready to use.</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="flex items-center gap-4">
            <Database className="h-6 w-6 text-[#22C55E]/80" />
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Records Extracted</p>
              <p className="text-lg font-bold text-white mt-0.5">{recordsExtracted.toLocaleString('en-US')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Calendar className="h-6 w-6 text-[#22C55E]/80" />
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Start Date</p>
              <p className="text-lg font-bold text-white mt-0.5">{startDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Calendar className="h-6 w-6 text-[#22C55E]/80" />
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">End Date</p>
              <p className="text-lg font-bold text-white mt-0.5">{endDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-[#22C55E]/80" />
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Total Duration</p>
              <p className="text-lg font-bold text-white mt-0.5">{duration}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Gauge className="h-6 w-6 text-[#22C55E]/80" />
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Average Speed</p>
              <p className="text-lg font-bold text-white mt-0.5">{speed.toLocaleString('en-US')} /min</p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

