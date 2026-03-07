import { generateSeeds, normalizeDomain } from "./seed";
import { bfsCrawl } from "./crawler";
import { classifyDocument } from "./classifier";

export interface CheckResult {
  domain: string;
  compliant: boolean;
  standards: string[];
  evidence: string[];
  pages_crawled: number;
  source_urls: string[];
}

export type ProgressCallback = (event: string, data: Record<string, unknown>) => void;

export async function runComplianceCheck(
  domain: string,
  opts: {
    maxDepth?: number;
    onProgress?: ProgressCallback;
  } = {}
): Promise<CheckResult> {
  const { maxDepth = 1, onProgress } = opts;
  const normalized = normalizeDomain(domain);

  const seeds = generateSeeds(normalized);
  onProgress?.("seeds", { urls: seeds });

  const pages = await bfsCrawl(seeds, normalized, {
    maxDepth,
    maxPages: 8,
    onProgress: (url, status) => onProgress?.("crawl", { url, status }),
  });

  onProgress?.("classify", { status: "started", pages: pages.length });

  const docParts = pages.map(([url, text]) => `--- ${url} ---\n\n${text}`);
  const fullText = docParts.join("\n\n");
  const classified = await classifyDocument(fullText);

  const evidence = Array.isArray(classified.evidence)
    ? classified.evidence
    : classified.evidence
      ? [classified.evidence]
      : [];

  return {
    domain: normalized,
    compliant: classified.compliant,
    standards: classified.standards,
    evidence,
    pages_crawled: pages.length,
    source_urls: pages.map(([url]) => url),
  };
}
