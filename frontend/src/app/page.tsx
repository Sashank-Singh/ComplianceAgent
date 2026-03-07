"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, AlertCircle, RotateCcw } from "lucide-react";
import { healthCheck } from "@/lib/api";
import { useComplianceCheck } from "@/hooks/useComplianceCheck";
import { useHistory } from "@/hooks/useHistory";
import { HistoryEntry } from "@/lib/types";
import DomainInput from "@/components/DomainInput";
import StatusTimeline from "@/components/StatusTimeline";
import ResultsPanel from "@/components/ResultsPanel";
import HistoryList from "@/components/HistoryList";

export default function Home() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const { stage, stageIndex, result, error, isLoading, crawlUrls, runCheck, showResult, reset } =
    useComplianceCheck();
  const { history, addEntry, clearHistory } = useHistory();

  useEffect(() => {
    healthCheck()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    if (result) addEntry(result);
  }, [result, addEntry]);

  const handleSubmit = useCallback(
    (domain: string) => {
      setSelectedDomain(domain);
      runCheck(domain);
    },
    [runCheck]
  );

  const handleDeepScan = useCallback(
    (domain: string) => {
      setSelectedDomain(domain);
      runCheck(domain, 2);
    },
    [runCheck]
  );

  const handleHistorySelect = useCallback(
    (entry: HistoryEntry) => {
      setSelectedDomain(entry.domain);
      showResult({
        domain: entry.domain,
        compliant: entry.compliant,
        standards: entry.standards,
        evidence: entry.evidence,
        pages_crawled: entry.pages_crawled,
        source_urls: entry.source_urls,
      });
    },
    [showResult]
  );

  const showTimeline = stage !== "idle" && stage !== "complete" && stage !== "error";
  const showResultPanel = stage === "complete" && result;
  const showError = stage === "error" && error;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="w-[18px] h-[18px] text-zinc-400" strokeWidth={1.5} />
          <span className="text-[15px] font-medium text-zinc-100 tracking-tight">
            ComplianceAgent
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              apiOnline === true
                ? "bg-emerald-500 animate-pulse-dot"
                : apiOnline === false
                ? "bg-red-500"
                : "bg-zinc-600"
            }`}
          />
          {apiOnline === true
            ? "Connected"
            : apiOnline === false
            ? "Offline"
            : "..."}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main content */}
        <main className={`flex-1 min-w-0 px-6 max-w-3xl mx-auto w-full ${
          stage === "idle" && !result ? "flex flex-col items-center justify-center" : "py-8 lg:py-12"
        }`}>
          {/* Headline + input centered when idle */}
          <AnimatePresence mode="wait">
            {stage === "idle" && !result && (
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full text-center"
              >
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
                  Compliance check
                </h1>
                <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
                  Scan any domain for SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, and other standards.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className={stage === "idle" && !result ? "w-full mt-6" : "mb-8"}>
            <DomainInput
              onSubmit={handleSubmit}
              onDeepScan={handleDeepScan}
              isLoading={isLoading}
              initialValue={selectedDomain}
              key={selectedDomain}
            />
          </div>

          {/* States */}
          <AnimatePresence mode="wait">
            {showTimeline && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8"
              >
                <StatusTimeline currentStageIndex={stageIndex} crawlUrls={crawlUrls} />
              </motion.div>
            )}

            {showResultPanel && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ResultsPanel result={result} />
              </motion.div>
            )}

            {showError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 p-5 rounded-lg border border-red-500/20 bg-red-500/[0.04]"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">Check failed</p>
                    <p className="text-sm text-zinc-500 mt-1">{error}</p>
                    <button
                      onClick={() => {
                        reset();
                        if (selectedDomain) runCheck(selectedDomain);
                      }}
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* History sidebar */}
        <aside className="lg:w-64 border-l border-white/[0.06] px-5 py-6 lg:py-8">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            History
          </p>
          <HistoryList
            entries={history}
            onSelect={handleHistorySelect}
            onClear={clearHistory}
          />
        </aside>
      </div>
    </div>
  );
}
