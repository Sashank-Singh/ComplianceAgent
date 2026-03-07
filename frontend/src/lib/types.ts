export interface CheckRequest {
  domain: string;
  max_depth?: number;
  use_spa?: boolean;
}

export interface CheckResponse {
  domain: string;
  compliant: boolean;
  standards: string[];
  evidence: (string | Record<string, string>)[];
  pages_crawled: number;
  source_urls: string[];
}

export interface HealthResponse {
  status: string;
  version: string;
}

export type CheckStage =
  | "idle"
  | "generating_seeds"
  | "crawling"
  | "classifying"
  | "aggregating"
  | "complete"
  | "error";

export interface StageDefinition {
  id: CheckStage;
  label: string;
  description: string;
  estimatedDurationMs: number;
}

export interface HistoryEntry {
  domain: string;
  compliant: boolean;
  standards: string[];
  pages_crawled: number;
  checkedAt: string;
}
