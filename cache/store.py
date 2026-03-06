"""Redis-backed cache for crawl results and compliance verdicts."""

import json
import logging
import os

import redis

logger = logging.getLogger(__name__)

# Default TTL: 24 hours
DEFAULT_TTL = 60 * 60 * 24


def _get_redis() -> redis.Redis:
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        db=int(os.getenv("REDIS_DB", "0")),
        decode_responses=True,
    )


def cache_key(domain: str) -> str:
    return f"compliance:{domain}"


def get_cached_result(domain: str) -> dict | None:
    """Return cached compliance result for *domain*, or None if absent."""
    try:
        r = _get_redis()
        raw = r.get(cache_key(domain))
        if raw:
            logger.info("Cache HIT for %s", domain)
            return json.loads(raw)
    except redis.RedisError as exc:
        logger.warning("Redis read error: %s", exc)
    return None


def set_cached_result(domain: str, result: dict, ttl: int = DEFAULT_TTL) -> None:
    """Store a compliance result in Redis with a TTL."""
    try:
        r = _get_redis()
        r.setex(cache_key(domain), ttl, json.dumps(result))
        logger.info("Cached result for %s (TTL=%ds)", domain, ttl)
    except redis.RedisError as exc:
        logger.warning("Redis write error: %s", exc)
