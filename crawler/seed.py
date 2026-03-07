"""Seed URL generator for compliance-related pages."""

from urllib.parse import urlparse

COMPLIANCE_PATHS = [
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
]

# Cloud/product subdomains where compliance info lives (main domain often has minimal content)
COMPLIANCE_SUBDOMAIN_MAP = {
    "amazon.com": ["aws.amazon.com"],   # AWS has SOC 2, ISO 27001, etc.
    "google.com": ["cloud.google.com"], # Google Cloud has compliance pages
}

# Extra paths for cloud subdomains (e.g. Google Cloud uses /security/compliance)
CLOUD_EXTRA_PATHS = ["/security/compliance", "/compliance/programs"]

LOCALE_PREFIXES = ["/en", "/de", "/fr"]


def normalize_domain(domain: str) -> str:
    """Strip protocol and trailing slashes from a domain string."""
    domain = domain.strip().rstrip("/")
    if domain.startswith(("http://", "https://")):
        domain = urlparse(domain).netloc
    return domain


def generate_seeds(domain: str, include_locales: bool = False) -> list[str]:
    """Generate a list of seed URLs targeting compliance-related pages.

    For domains like amazon.com and google.com, also seeds known subdomains
    (aws.amazon.com, cloud.google.com) where compliance info lives.

    Args:
        domain: Company domain (e.g. 'stripe.com').
        include_locales: If True, also generate locale-prefixed paths.

    Returns:
        List of fully-qualified URLs to crawl.
    """
    domain = normalize_domain(domain)
    urls: list[str] = []

    # For domains with known compliance subdomains, seed those FIRST (they have the real content)
    for subdomain in COMPLIANCE_SUBDOMAIN_MAP.get(domain.lower(), []):
        sub_base = f"https://{subdomain}"
        urls.extend(f"{sub_base}{path}" for path in COMPLIANCE_PATHS)
        urls.extend(f"{sub_base}{path}" for path in CLOUD_EXTRA_PATHS)

    # Main domain seeds
    base = f"https://{domain}"
    urls.extend(f"{base}{path}" for path in COMPLIANCE_PATHS)

    if include_locales:
        for locale in LOCALE_PREFIXES:
            urls.extend(f"{base}{locale}{path}" for path in COMPLIANCE_PATHS)

    return urls
