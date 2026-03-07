import OpenAI from "openai";

const FULL_DOCUMENT_PROMPT = `You are a compliance analyst. The following text is from multiple pages of a company's website (privacy, security, legal, etc.). Analyze ALL of it and determine whether the company claims compliance with any of these security/privacy standards:

- SOC 2 (Type I or Type II)
- ISO 27001
- GDPR
- HIPAA
- PCI DSS
- SOC 1
- FedRAMP
- CCPA

Instructions:
1. Only mark a standard as claimed if the text explicitly states compliance, certification, or adherence.
2. Marketing language like "we take security seriously" without naming a standard does NOT count.
3. Extract a short evidence quote (max 150 chars) for each claimed standard.
4. Consider the entire document — standards may appear on different pages.

Respond ONLY with valid JSON in this exact format — no markdown, no commentary:
{"compliant": true/false, "standards": ["STANDARD_NAME", ...], "evidence": "short quote from the text"}

Document:
`;

const MAX_WORDS = 80_000;

export interface ClassifyResult {
  compliant: boolean;
  standards: string[];
  evidence: string | string[];
}

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function parseResponse(raw: string): ClassifyResult {
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim());
    return {
      compliant: Boolean(parsed.compliant),
      standards: Array.isArray(parsed.standards) ? parsed.standards : [],
      evidence: parsed.evidence ?? "",
    };
  } catch {
    return { compliant: false, standards: [], evidence: "" };
  }
}

export async function classifyDocument(fullText: string): Promise<ClassifyResult> {
  const words = fullText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { compliant: false, standards: [], evidence: [] };

  const client = getClient();
  const model = process.env.CLASSIFIER_MODEL ?? "gpt-4o-mini";

  if (words.length <= MAX_WORDS) {
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: FULL_DOCUMENT_PROMPT + fullText }],
      temperature: 0,
      max_tokens: 1024,
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "{}";
    const r = parseResponse(raw);
    return {
      ...r,
      evidence: r.evidence ? [r.evidence as string] : [],
    };
  }

  const chunkResults: ClassifyResult[] = [];
  for (let start = 0; start < words.length; start += MAX_WORDS) {
    const end = Math.min(start + MAX_WORDS, words.length);
    const chunk = words.slice(start, end).join(" ");
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: FULL_DOCUMENT_PROMPT + chunk }],
      temperature: 0,
      max_tokens: 1024,
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "{}";
    chunkResults.push(parseResponse(raw));
    if (start + MAX_WORDS < words.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return aggregate(chunkResults);
}

function aggregate(chunkResults: ClassifyResult[]): ClassifyResult {
  const compliant = chunkResults.some((r) => r.compliant);
  const seen = new Set<string>();
  const standards: string[] = [];
  const evidence: string[] = [];

  for (const r of chunkResults) {
    for (const s of r.standards) {
      const n = s.trim().toUpperCase();
      if (!seen.has(n)) {
        seen.add(n);
        standards.push(s.trim());
      }
    }
    if (r.compliant && r.evidence) {
      evidence.push(typeof r.evidence === "string" ? r.evidence : r.evidence.join(" "));
    }
  }

  return { compliant, standards, evidence };
}
