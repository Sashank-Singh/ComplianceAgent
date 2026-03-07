"use client";

import { useCallback, useRef, useState } from "react";
import { checkDomain } from "@/lib/api";
import { CHECK_STAGES } from "@/lib/constants";
import { CheckRequest, CheckResponse, CheckStage } from "@/lib/types";

export function useComplianceCheck() {
  const [stage, setStage] = useState<CheckStage>("idle");
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runCheck = useCallback(
    async (domain: string, options?: Partial<CheckRequest>) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setResult(null);
      setStageIndex(0);
      setStage("generating_seeds");

      // Simulate progress through pipeline stages
      const timers: NodeJS.Timeout[] = [];
      let elapsed = 0;
      CHECK_STAGES.forEach((s, i) => {
        if (i === 0) return;
        elapsed += CHECK_STAGES[i - 1].estimatedDurationMs;
        const timer = setTimeout(() => {
          setStageIndex(i);
          setStage(s.id);
        }, elapsed);
        timers.push(timer);
      });

      try {
        const data = await checkDomain(
          { domain, ...options },
          controller.signal
        );
        timers.forEach(clearTimeout);
        setStage("complete");
        setStageIndex(CHECK_STAGES.length);
        setResult(data);
      } catch (err) {
        timers.forEach(clearTimeout);
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStage("error");
        setError(err instanceof Error ? err.message : "Check failed");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setStageIndex(-1);
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { stage, stageIndex, result, error, isLoading, runCheck, reset };
}
