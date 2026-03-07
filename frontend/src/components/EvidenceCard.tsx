"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface EvidenceCardProps {
  evidence: string;
  index: number;
}

export default function EvidenceCard({ evidence, index }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = evidence.length > 140;
  const preview = isLong ? evidence.slice(0, 140) + "..." : evidence;

  return (
    <div
      className="py-3 border-b border-white/[0.04] last:border-0 cursor-pointer group"
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <p className="text-sm text-zinc-400 leading-relaxed">
        {expanded ? evidence : preview}
      </p>
      {isLong && (
        <button className="mt-1.5 text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors flex items-center gap-1">
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
