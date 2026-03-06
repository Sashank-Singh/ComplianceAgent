"""Static page crawler using BeautifulSoup + requests."""

import logging
import random
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]


def _get_headers() -> dict[str, str]:
    return {"User-Agent": random.choice(USER_AGENTS)}


def polite_delay(min_sec: float = 0.5, max_sec: float = 1.5) -> None:
    """Random delay between requests to avoid rate-limiting."""
    time.sleep(random.uniform(min_sec, max_sec))


def fetch_with_backoff(url: str, retries: int = 3, timeout: int = 10) -> requests.Response | None:
    """Fetch a URL with exponential back-off on transient failures.

    Returns None immediately for 404 (page not found) and 403 (forbidden)
    without retrying. Only retries on 5xx server errors, timeouts, and
    connection errors.
    """
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=_get_headers(), timeout=timeout)

            # Don't retry client errors — the page simply doesn't exist
            if resp.status_code == 404:
                logger.debug("404 Not Found (skipping): %s", url)
                return None
            if resp.status_code == 403:
                logger.debug("403 Forbidden (skipping): %s", url)
                return None
            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                logger.warning("Rate-limited on %s, backing off %ds", url, wait)
                time.sleep(wait)
                continue

            resp.raise_for_status()
            return resp

        except requests.exceptions.Timeout:
            wait = 2 ** attempt
            logger.warning("Timeout on %s (attempt %d/%d), retrying in %ds", url, attempt + 1, retries, wait)
            time.sleep(wait)
        except requests.exceptions.ConnectionError:
            wait = 2 ** attempt
            logger.warning("Connection error on %s (attempt %d/%d), retrying in %ds", url, attempt + 1, retries, wait)
            time.sleep(wait)
        except requests.exceptions.HTTPError as exc:
            if resp.status_code >= 500:
                wait = 2 ** attempt
                logger.warning("Server error %d on %s (attempt %d/%d), retrying in %ds", resp.status_code, url, attempt + 1, retries, wait)
                time.sleep(wait)
            else:
                logger.debug("HTTP %d for %s (skipping): %s", resp.status_code, url, exc)
                return None

    logger.warning("All %d attempts failed for %s", retries, url)
    return None


def fetch_page(url: str) -> tuple[str, list[str]]:
    """Fetch a page and return (cleaned_text, list_of_links).

    Links are resolved to absolute URLs relative to the page.
    """
    resp = fetch_with_backoff(url)
    if resp is None:
        return "", []

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove script / style noise
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)

    links: list[str] = []
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        absolute = urljoin(url, href)
        links.append(absolute)

    return text, links
