"""Breadth-first crawl with depth limiting and relevance filtering."""

import logging
import re
from collections import deque
from urllib.parse import urlparse

from crawler.static_crawler import fetch_page, polite_delay

logger = logging.getLogger(__name__)

# At depth > 0 only follow links whose path contains compliance-related keywords
_RELEVANT_PATH_PATTERN = re.compile(
    r"(secur|trust|privacy|legal|complian|gdpr|hipaa|soc|iso|pci|certif|data.protect|terms|policy|about)",
    re.IGNORECASE,
)

# Skip common non-content paths
_SKIP_PATTERNS = re.compile(
    r"(login|register|signup|sign-up|dashboard|cart|checkout|pricing|blog/\d|/docs/|/api/|#|mailto:|javascript:)",
    re.IGNORECASE,
)


def _same_domain(url: str, domain: str) -> bool:
    """Check whether a URL belongs to the target domain."""
    try:
        return domain in urlparse(url).netloc
    except Exception:
        return False


def _is_relevant_link(url: str, depth: int) -> bool:
    """Decide whether a discovered link is worth following.

    At depth 0 we follow everything (seed URLs). At depth > 0 we only
    follow links whose path looks compliance-related, and we always skip
    known non-content paths.
    """
    if _SKIP_PATTERNS.search(url):
        return False
    if depth == 0:
        return True
    path = urlparse(url).path
    return bool(_RELEVANT_PATH_PATTERN.search(path))


def bfs_crawl(
    seed_urls: list[str],
    domain: str,
    max_depth: int = 1,
    max_pages: int = 12,
    use_spa: bool = False,
) -> list[tuple[str, str]]:
    """Crawl starting from *seed_urls*, expanding links up to *max_depth*.

    Args:
        seed_urls: Initial URLs to visit.
        domain: Target domain used to filter outgoing links.
        max_depth: Maximum BFS depth.
        max_pages: Hard cap on total pages fetched.
        use_spa: If True, fall back to Playwright for pages returning no text.

    Returns:
        List of (url, page_text) tuples.
    """
    visited: set[str] = set()
    queue: deque[tuple[str, int]] = deque()
    results: list[tuple[str, str]] = []

    for url in seed_urls:
        queue.append((url, 0))

    while queue and len(results) < max_pages:
        url, depth = queue.popleft()

        # Normalise: strip fragment identifiers so /security and /security#main-content aren't crawled twice
        clean_url = url.split("#")[0]
        if clean_url in visited or depth > max_depth:
            continue
        visited.add(clean_url)

        logger.info("Crawling [depth=%d]: %s", depth, clean_url)
        text, links = fetch_page(clean_url)

        # Fallback to Playwright if static fetch returned empty text
        if not text.strip() and use_spa:
            from crawler.spa_crawler import fetch_spa_page

            logger.info("Falling back to SPA renderer for %s", clean_url)
            text = fetch_spa_page(clean_url)

        if text.strip():
            results.append((clean_url, text))

        # Expand links within the same domain (with relevance filtering)
        if depth < max_depth:
            for link in links:
                link_clean = link.split("#")[0]
                if (
                    _same_domain(link_clean, domain)
                    and link_clean not in visited
                    and _is_relevant_link(link_clean, depth + 1)
                ):
                    queue.append((link_clean, depth + 1))

        polite_delay()

    logger.info("BFS crawl complete: %d pages collected", len(results))
    return results
