import { CheckRequest, CheckResponse, HealthResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function checkDomain(
  request: CheckRequest,
  signal?: AbortSignal
): Promise<CheckResponse> {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getCachedResult(
  domain: string
): Promise<CheckResponse | null> {
  const res = await fetch(
    `${API_BASE}/result/${encodeURIComponent(domain)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function healthCheck(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("API unreachable");
  return res.json();
}
