const COMPLIANCE_PATHS = [
  "/security",
  "/trust",
  "/privacy",
  "/legal",
  "/about",
  "/compliance",
  "/gdpr",
  "/terms",
  "/data-protection",
  "/certifications",
];

const COMPLIANCE_SUBDOMAIN_MAP: Record<string, string[]> = {
  "amazon.com": ["aws.amazon.com"],
  "google.com": ["cloud.google.com"],
};

const CLOUD_EXTRA_PATHS = ["/security/compliance", "/compliance/programs"];

export function normalizeDomain(domain: string): string {
  domain = domain.trim().replace(/\/+$/, "");
  try {
    if (domain.startsWith("http://") || domain.startsWith("https://")) {
      domain = new URL(domain).hostname;
    }
  } catch {
    // keep as-is
  }
  return domain;
}

export function generateSeeds(domain: string): string[] {
  domain = normalizeDomain(domain);
  const urls: string[] = [];

  for (const subdomain of COMPLIANCE_SUBDOMAIN_MAP[domain.toLowerCase()] ?? []) {
    const subBase = `https://${subdomain}`;
    urls.push(...COMPLIANCE_PATHS.map((p) => subBase + p));
    urls.push(...CLOUD_EXTRA_PATHS.map((p) => subBase + p));
  }

  const base = `https://${domain}`;
  urls.push(...COMPLIANCE_PATHS.map((p) => base + p));

  return urls;
}
