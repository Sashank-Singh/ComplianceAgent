"use client";

import { useCallback, useRef, useState } from "react";
import { CheckResponse, CheckStage, CrawlUrl } from "@/lib/types";

// Same-origin /api when unset (Vercel). External URL when NEXT_PUBLIC_API_URL is set.
const getStreamUrl = (params: URLSearchParams) =>
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/check/stream?${params}`
    : `/api/check/stream?${params}`;

export function useComplianceCheck() {
  const [stage, setStage] = useState<CheckStage>("idle");
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [crawlUrls, setCrawlUrls] = useState<CrawlUrl[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const showResult = useCallback((data: CheckResponse) => {
    setStage("complete");
    setStageIndex(4);
    setResult(data);
    setIsLoading(false);
    setError(null);
    setCrawlUrls([]);
  }, []);

  const runCheck = useCallback(
    async (domain: string, maxDepth: number = 1) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setResult(null);
      setCrawlUrls([]);
      setStageIndex(0);
      setStage("generating_seeds");

      const params = new URLSearchParams({ domain, max_depth: String(maxDepth) });

      try {
        const res = await fetch(getStreamUrl(params), { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines: each event is "data: {...}\n\n"
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            try {
              const msg = JSON.parse(jsonStr);
              handleEvent(msg);
            } catch {
              // skip malformed JSON
            }
          }
        }

        // Handle any remaining data in buffer
        if (buffer.trim().startsWith("data: ")) {
          try {
            const msg = JSON.parse(buffer.trim().slice(6));
            handleEvent(msg);
          } catch {
            // skip
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStage("error");
        setError(err instanceof Error ? err.message : "Check failed");
      } finally {
        setIsLoading(false);
      }

      function handleEvent(msg: { event: string; data: Record<string, unknown> }) {
        switch (msg.event) {
          case "seeds":
            setStageIndex(1);
            setStage("crawling");
            break;

          case "crawl": {
            const crawlData = msg.data as { url: string; status: string };
            setCrawlUrls((prev) => {
              const exists = prev.findIndex((c) => c.url === crawlData.url);
              const entry: CrawlUrl = {
                url: crawlData.url,
                status: crawlData.status as CrawlUrl["status"],
              };
              if (exists >= 0) {
                const next = [...prev];
                next[exists] = entry;
                return next;
              }
              return [...prev, entry];
            });
            break;
          }

          case "classify":
            setStageIndex(2);
            setStage("classifying");
            break;

          case "result": {
            const data = msg.data as unknown as CheckResponse;
            setStageIndex(4);
            setStage("complete");
            setResult(data);
            break;
          }

          case "error":
            setStage("error");
            setError((msg.data as { message: string }).message || "Check failed");
            break;
        }
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
    setCrawlUrls([]);
  }, []);

  return { stage, stageIndex, result, error, isLoading, crawlUrls, runCheck, showResult, reset };
}
