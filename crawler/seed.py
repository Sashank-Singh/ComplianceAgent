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

LOCALE_PREFIXES = ["/en", "/de", "/fr"]


def normalize_domain(domain: str) -> str:
    """Strip protocol and trailing slashes from a domain string."""
    domain = domain.strip().rstrip("/")
    if domain.startswith(("http://", "https://")):
        domain = urlparse(domain).netloc
    return domain


def generate_seeds(domain: str, include_locales: bool = False) -> list[str]:
    """Generate a list of seed URLs targeting compliance-related pages.

    Args:
        domain: Company domain (e.g. 'stripe.com').
        include_locales: If True, also generate locale-prefixed paths.

    Returns:
        List of fully-qualified URLs to crawl.
    """
    domain = normalize_domain(domain)
    base = f"https://{domain}"
    urls = [f"{base}{path}" for path in COMPLIANCE_PATHS]

    if include_locales:
        for locale in LOCALE_PREFIXES:
            urls.extend(f"{base}{locale}{path}" for path in COMPLIANCE_PATHS)

    return urls
