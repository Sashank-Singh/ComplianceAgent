"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Globe } from "lucide-react";
import { CHECK_STAGES } from "@/lib/constants";
import { CrawlUrl } from "@/lib/types";

interface StatusTimelineProps {
  currentStageIndex: number;
  crawlUrls?: CrawlUrl[];
}

export default function StatusTimeline({ currentStageIndex, crawlUrls = [] }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {CHECK_STAGES.map((stage, i) => {
        const isComplete = i < currentStageIndex;
        const isActive = i === currentStageIndex;
        const isCrawling = stage.id === "crawling" && isActive;

        return (
          <div key={stage.id}>
            <div className="flex items-start gap-3">
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

              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isComplete ? "text-emerald-500" : isActive ? "text-zinc-200" : "text-zinc-600"}`}>
                  {stage.label}
                  {isCrawling && crawlUrls.length > 0 && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {crawlUrls.filter((u) => u.status === "done").length}/{crawlUrls.length}
                    </span>
                  )}
                </p>
                {isActive && !isCrawling && (
                  <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>
                )}
              </div>
            </div>

            {/* Live crawl URLs */}
            {(isCrawling || (stage.id === "crawling" && isComplete)) && crawlUrls.length > 0 && (
              <div className="ml-8 mt-2 space-y-0.5 max-h-48 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {crawlUrls.map((item) => (
                    <motion.div
                      key={item.url}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-2 py-0.5"
                    >
                      {item.status === "fetching" ? (
                        <Loader2 className="w-3 h-3 text-zinc-500 animate-spin shrink-0" />
                      ) : item.status === "done" ? (
                        <Globe className="w-3 h-3 text-emerald-500/70 shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-zinc-700 shrink-0" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          item.status === "fetching"
                            ? "text-zinc-400"
                            : item.status === "done"
                            ? "text-zinc-500"
                            : "text-zinc-700"
                        }`}
                      >
                        {item.url.replace(/^https?:\/\//, "")}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
