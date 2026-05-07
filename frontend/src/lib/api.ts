const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSymbols(query: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/symbols/?q=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  return response.json();
}

export interface ExtractionPreviewRequest {
  symbol: string;
  interval: string;
  range_from: string;
  range_to: string;
}

export interface ExtractionEstimate {
  candles_total: number;
  requests_total: number;
  eta_seconds: number;
  mb_estimate: number;
}

export async function getExtractionPreview(request: ExtractionPreviewRequest): Promise<ExtractionEstimate> {
  const response = await fetch(`${API_URL}/extractions/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error("Failed to get preview");
  return response.json();
}

export async function startExtraction(request: ExtractionPreviewRequest): Promise<{ job_id: string }> {
  const response = await fetch(`${API_URL}/extractions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error("Failed to start extraction");
  return response.json();
}
