"use client";

import { Check, Loader2 } from "lucide-react";
import { CHECK_STAGES } from "@/lib/constants";

interface StatusTimelineProps {
  currentStageIndex: number;
}

export default function StatusTimeline({ currentStageIndex }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {CHECK_STAGES.map((stage, i) => {
        const isComplete = i < currentStageIndex;
        const isActive = i === currentStageIndex;

        return (
          <div key={stage.id} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {isComplete ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
                </div>
              ) : isActive ? (
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-zinc-300 animate-spin" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                </div>
              )}
            </div>

            <div>
              <p className={`text-sm ${isComplete ? "text-emerald-500" : isActive ? "text-zinc-200" : "text-zinc-600"}`}>
                {stage.label}
              </p>
              {isActive && (
                <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
