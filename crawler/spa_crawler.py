"""SPA-aware crawler using Playwright for JS-rendered pages."""

import logging

logger = logging.getLogger(__name__)


def fetch_spa_page(url: str, timeout_ms: int = 30_000) -> str:
    """Render a JS-heavy page with headless Chromium and return body text.

    Args:
        url: Page URL to render.
        timeout_ms: Max time to wait for network idle (ms).

    Returns:
        Visible text content of the rendered page.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("Playwright is not installed. Run: pip install playwright && playwright install chromium")
        return ""

    text = ""
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            text = page.inner_text("body")
            browser.close()
    except Exception as exc:
        logger.error("Playwright failed for %s: %s", url, exc)

    return text
