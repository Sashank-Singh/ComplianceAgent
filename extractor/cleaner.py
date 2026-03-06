"""HTML cleaning utilities for extracting meaningful text."""

import re

from bs4 import BeautifulSoup


def clean_html(raw_html: str) -> str:
    """Strip all HTML tags, scripts, styles and return plain text.

    Args:
        raw_html: Raw HTML string.

    Returns:
        Cleaned plain-text string with normalized whitespace.
    """
    soup = BeautifulSoup(raw_html, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg", "img", "video", "audio"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    # Collapse multiple whitespace / newlines
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_main_content(raw_html: str) -> str:
    """Try to extract only the main content area, falling back to full clean.

    Looks for <main>, <article>, or role='main' elements first.
    """
    soup = BeautifulSoup(raw_html, "html.parser")

    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(attrs={"role": "main"})
    )

    if main:
        for tag in main(["script", "style", "noscript"]):
            tag.decompose()
        text = main.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    return clean_html(raw_html)
