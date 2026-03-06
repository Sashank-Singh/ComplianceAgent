"""Breadth-first crawl with depth limiting."""

import logging
from collections import deque
from urllib.parse import urlparse

from crawler.static_crawler import fetch_page, polite_delay

logger = logging.getLogger(__name__)


def _same_domain(url: str, domain: str) -> bool:
    """Check whether a URL belongs to the target domain."""
    try:
        return domain in urlparse(url).netloc
    except Exception:
        return False


def bfs_crawl(
    seed_urls: list[str],
    domain: str,
    max_depth: int = 2,
    max_pages: int = 50,
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

        if url in visited or depth > max_depth:
            continue
        visited.add(url)

        logger.info("Crawling [depth=%d]: %s", depth, url)
        text, links = fetch_page(url)

        # Fallback to Playwright if static fetch returned empty text
        if not text.strip() and use_spa:
            from crawler.spa_crawler import fetch_spa_page

            logger.info("Falling back to SPA renderer for %s", url)
            text = fetch_spa_page(url)

        if text.strip():
            results.append((url, text))

        # Expand links within the same domain
        if depth < max_depth:
            for link in links:
                if _same_domain(link, domain) and link not in visited:
                    queue.append((link, depth + 1))

        polite_delay()

    logger.info("BFS crawl complete: %d pages collected", len(results))
    return results
