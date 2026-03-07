import { CheckResponse, HistoryEntry } from "./types";

const STORAGE_KEY = "compliance-agent-history";
const MAX_ENTRIES = 50;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(result: CheckResponse): HistoryEntry[] {
  const entries = getHistory();
  const entry: HistoryEntry = {
    domain: result.domain,
    compliant: result.compliant,
    standards: result.standards,
    pages_crawled: result.pages_crawled,
    checkedAt: new Date().toISOString(),
  };
  const filtered = entries.filter((e) => e.domain !== entry.domain);
  const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
