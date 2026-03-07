"use client";

import { motion } from "framer-motion";
import { CheckResponse } from "@/lib/types";
import ComplianceBadge from "./ComplianceBadge";
import StandardsPills from "./StandardsPills";
import EvidenceCard from "./EvidenceCard";
import SourceUrlList from "./SourceUrlList";

interface ResultsPanelProps {
  result: CheckResponse;
}

function flattenEvidence(evidence: (string | Record<string, string>)[]): string[] {
  const items: string[] = [];
  for (const e of evidence) {
    if (typeof e === "string") {
      items.push(e);
    } else if (typeof e === "object" && e !== null) {
      for (const val of Object.values(e)) {
        items.push(val);
      }
    }
  }
  return [...new Set(items)].filter(Boolean);
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const evidenceItems = flattenEvidence(result.evidence);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header: badge + standards */}
      <div className="space-y-4">
        <ComplianceBadge compliant={result.compliant} domain={result.domain} />
        <StandardsPills standards={result.standards} />
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.04]" />

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>{result.pages_crawled} pages analyzed</span>
        <span className="text-zinc-800">|</span>
        <span>{result.standards.length} standard{result.standards.length !== 1 ? "s" : ""} detected</span>
        <span className="text-zinc-800">|</span>
        <span>{evidenceItems.length} evidence snippets</span>
      </div>

      {/* Evidence */}
      {evidenceItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Evidence
          </p>
          <div className="bg-zinc-900 rounded-lg border border-white/[0.04] px-4">
            {evidenceItems.slice(0, 12).map((ev, i) => (
              <EvidenceCard key={i} evidence={ev} index={i} />
            ))}
          </div>
          {evidenceItems.length > 12 && (
            <p className="text-xs text-zinc-600 mt-2">
              + {evidenceItems.length - 12} more
            </p>
          )}
        </div>
      )}

      {/* Sources */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          Sources
        </p>
        <SourceUrlList urls={result.source_urls} />
      </div>
    </motion.div>
  );
}
