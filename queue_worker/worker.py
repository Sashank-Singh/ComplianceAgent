"""Redis Queue worker for processing domain compliance checks."""

import logging
import os
from typing import Callable, Optional

from redis import Redis
from rq import Queue

from cache.store import get_cached_result, set_cached_result
from classifier.classify import classify_document
from crawler.bfs import bfs_crawl
from crawler.seed import generate_seeds, normalize_domain

logger = logging.getLogger(__name__)


def _get_queue() -> Queue:
    conn = Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
    )
    return Queue(connection=conn)


def check_domain(
    domain: str,
    max_depth: int = 2,
    use_spa: bool = False,
    on_progress: Optional[Callable[[str, dict], None]] = None,
) -> dict:
    """Full compliance-check pipeline for a single domain.

    1. Check cache
    2. Generate seed URLs
    3. BFS crawl
    4. Chunk text
    5. Classify each chunk
    6. Aggregate results
    7. Cache and return

    Args:
        on_progress: Optional callback ``(event_type, data)`` for streaming
            progress. event_type is one of: ``"seeds"``, ``"crawl"``,
            ``"classify"``, ``"result"``.
    """
    domain = normalize_domain(domain)

    cached = get_cached_result(domain)
    if cached is not None:
        return cached

    logger.info("Starting compliance check for %s", domain)

    seeds = generate_seeds(domain)
    if on_progress:
        on_progress("seeds", {"urls": seeds})

    def crawl_progress(url: str, status: str) -> None:
        if on_progress:
            on_progress("crawl", {"url": url, "status": status})

    pages = bfs_crawl(
        seeds, domain, max_depth=max_depth, use_spa=use_spa,
        on_progress=crawl_progress,
    )

    if on_progress:
        on_progress("classify", {"status": "started", "pages": len(pages)})

    # Combine all page text into one document (with section headers)
    doc_parts = []
    for url, text in pages:
        doc_parts.append(f"--- {url} ---\n\n{text}")
    full_text = "\n\n".join(doc_parts)

    # Single API call (or 2 if document is very large)
    final = classify_document(full_text)
    final["domain"] = domain
    final["pages_crawled"] = len(pages)
    final["source_urls"] = [url for url, _ in pages]

    set_cached_result(domain, final)
    logger.info("Compliance check complete for %s: compliant=%s", domain, final["compliant"])
    return final


def enqueue_domain(domain: str) -> str:
    """Push a domain check onto the Redis queue and return the job ID."""
    q = _get_queue()
    job = q.enqueue(check_domain, domain)
    logger.info("Enqueued job %s for domain %s", job.id, domain)
    return job.id
