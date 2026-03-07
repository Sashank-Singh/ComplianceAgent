import * as cheerio from "cheerio";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPage(
  url: string,
  retries = 3,
  timeout = 10000
): Promise<{ text: string; links: string[] }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        headers: { "User-Agent": randomUserAgent() },
        signal: controller.signal,
      });
      clearTimeout(id);

      if (res.status === 404 || res.status === 403) return { text: "", links: [] };
      if (res.status === 429) {
        await delay(2 ** (attempt + 1) * 1000);
        continue;
      }
      if (!res.ok && res.status >= 500) {
        await delay(2 ** attempt * 1000);
        continue;
      }
      if (!res.ok) return { text: "", links: [] };

      const html = await res.text();
      const $ = cheerio.load(html);

      $("script, style, noscript, header, footer, nav").remove();
      const text = $("body").text().replace(/\s+/g, " ").trim();

      const links: string[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:"))
          return;
        try {
          links.push(new URL(href, url).href);
        } catch {
          // skip invalid URLs
        }
      });

      return { text, links };
    } catch (err) {
      if (attempt === retries - 1) return { text: "", links: [] };
      await delay(2 ** attempt * 1000);
    }
  }
  return { text: "", links: [] };
}

const RELEVANT_PATH = /secur|trust|privacy|legal|complian|gdpr|hipaa|soc|iso|pci|certif|data\.protect|terms|policy|about/i;
const SKIP_PATTERNS = /login|register|signup|sign-up|dashboard|cart|checkout|pricing|blog\/\d|\/docs\/|\/api\//i;

function sameDomain(url: string, domain: string): boolean {
  try {
    const netloc = new URL(url).hostname.toLowerCase();
    const domainLower = domain.toLowerCase();
    return netloc === domainLower || netloc.endsWith("." + domainLower);
  } catch {
    return false;
  }
}

function isRelevantLink(url: string, depth: number): boolean {
  if (SKIP_PATTERNS.test(url)) return false;
  if (depth === 0) return true;
  try {
    return RELEVANT_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export type CrawlProgress = (url: string, status: "fetching" | "done" | "skip") => void;

export async function bfsCrawl(
  seedUrls: string[],
  domain: string,
  opts: {
    maxDepth?: number;
    maxPages?: number;
    onProgress?: CrawlProgress;
  } = {}
): Promise<[string, string][]> {
  const { maxDepth = 1, maxPages = 8, onProgress } = opts;
  const visited = new Set<string>();
  const queue: [string, number][] = seedUrls.map((u) => [u.split("#")[0], 0]);
  const results: [string, string][] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const [url, depth] = queue.shift()!;
    const cleanUrl = url.split("#")[0];
    if (visited.has(cleanUrl) || depth > maxDepth) continue;
    visited.add(cleanUrl);

    onProgress?.(cleanUrl, "fetching");
    const { text, links } = await fetchPage(cleanUrl);

    if (text.trim()) {
      results.push([cleanUrl, text]);
      onProgress?.(cleanUrl, "done");
    } else {
      onProgress?.(cleanUrl, "skip");
    }

    if (depth < maxDepth) {
      for (const link of links) {
        const linkClean = link.split("#")[0];
        if (
          sameDomain(linkClean, domain) &&
          !visited.has(linkClean) &&
          isRelevantLink(linkClean, depth + 1)
        ) {
          queue.push([linkClean, depth + 1]);
        }
      }
    }

    await delay(300 + Math.random() * 500);
  }

  return results;
}
