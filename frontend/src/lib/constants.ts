import { StageDefinition } from "./types";

export const STANDARD_COLORS: Record<string, { bg: string; text: string }> = {
  "SOC 2":     { bg: "bg-blue-500/10",    text: "text-blue-400" },
  "SOC 1":     { bg: "bg-blue-500/10",    text: "text-blue-300" },
  "ISO 27001": { bg: "bg-violet-500/10",  text: "text-violet-400" },
  GDPR:        { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  HIPAA:       { bg: "bg-rose-500/10",    text: "text-rose-400" },
  "PCI DSS":   { bg: "bg-amber-500/10",   text: "text-amber-400" },
  FedRAMP:     { bg: "bg-yellow-500/10",  text: "text-yellow-400" },
  CCPA:        { bg: "bg-teal-500/10",    text: "text-teal-400" },
  DEFAULT:     { bg: "bg-zinc-500/10",    text: "text-zinc-400" },
};

export const CHECK_STAGES: StageDefinition[] = [
  {
    id: "generating_seeds",
    label: "Discovering URLs",
    description: "Finding compliance-related pages",
    estimatedDurationMs: 2000,
  },
  {
    id: "crawling",
    label: "Crawling pages",
    description: "Extracting page content",
    estimatedDurationMs: 25000,
  },
  {
    id: "classifying",
    label: "Analyzing content",
    description: "Classifying with LLM",
    estimatedDurationMs: 20000,
  },
  {
    id: "aggregating",
    label: "Compiling results",
    description: "Aggregating findings",
    estimatedDurationMs: 3000,
  },
];
