"""LLM-based compliance classification for text chunks."""

import json
import logging
import os
import time

import openai

from classifier.prompt import CLASSIFICATION_PROMPT, FULL_DOCUMENT_PROMPT

logger = logging.getLogger(__name__)

# Defaults — override via environment variables
DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TEMPERATURE = 0.0
DEFAULT_MAX_TOKENS = 512

# Stay under OpenAI TPM (200k tokens/min). ~80k words ≈ 100k tokens per request.
# Fewer, larger chunks = fewer API calls. Increase if you hit 429.
MAX_WORDS_PER_REQUEST = 80_000
DELAY_BETWEEN_REQUESTS_SEC = 1


def _get_client() -> openai.OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return openai.OpenAI(api_key=api_key)


def classify_chunk(chunk: str, model: str | None = None) -> dict:
    """Send a text chunk to the LLM and parse the compliance verdict.

    Args:
        chunk: Text to classify.
        model: OpenAI model ID (defaults to gpt-4o-mini).

    Returns:
        Dict with keys: compliant (bool), standards (list), evidence (str).
    """
    model = model or os.getenv("CLASSIFIER_MODEL", DEFAULT_MODEL)
    client = _get_client()

    prompt = CLASSIFICATION_PROMPT.format(text=chunk)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=DEFAULT_TEMPERATURE,
            max_tokens=DEFAULT_MAX_TOKENS,
        )
        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)

        # Normalise keys
        return {
            "compliant": bool(result.get("compliant", False)),
            "standards": result.get("standards", []),
            "evidence": result.get("evidence", ""),
        }
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM response as JSON: %s — raw: %s", exc, raw)
        return {"compliant": False, "standards": [], "evidence": ""}
    except openai.OpenAIError as exc:
        logger.error("OpenAI API error: %s", exc)
        return {"compliant": False, "standards": [], "evidence": ""}


def classify_document(full_text: str, model: str | None = None) -> dict:
    """Classify a full document (all crawled pages combined) in 1–N API requests.

    Splits into chunks to stay under OpenAI TPM (200k tokens/min). Uses 1 request
    when small; otherwise splits and aggregates. Adds delay between requests.

    Args:
        full_text: Concatenated text from all crawled pages.
        model: OpenAI model ID (defaults to gpt-4o-mini).

    Returns:
        Dict with keys: compliant (bool), standards (list), evidence (list).
    """
    words = full_text.split()
    if not words:
        return {"compliant": False, "standards": [], "evidence": []}

    from aggregator.combine import aggregate

    if len(words) <= MAX_WORDS_PER_REQUEST:
        result = _classify_single(full_text, model)
        r = _to_aggregatable(result)
        return {
            "compliant": r["compliant"],
            "standards": r["standards"],
            "evidence": [r["evidence"]] if r.get("evidence") else [],
        }

    # Split into chunks that stay under TPM; add delay between requests
    chunk_results: list[dict] = []
    start = 0
    while start < len(words):
        end = min(start + MAX_WORDS_PER_REQUEST, len(words))
        chunk = " ".join(words[start:end])
        if chunk_results:
            time.sleep(DELAY_BETWEEN_REQUESTS_SEC)
        r = _classify_single(chunk, model)
        chunk_results.append(_to_aggregatable(r))
        start = end

    return aggregate(chunk_results)


def _classify_single(text: str, model: str | None) -> dict:
    """One API call for full-document classification."""
    model = model or os.getenv("CLASSIFIER_MODEL", DEFAULT_MODEL)
    client = _get_client()
    prompt = FULL_DOCUMENT_PROMPT.format(text=text)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=DEFAULT_TEMPERATURE,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)
        return {
            "compliant": bool(result.get("compliant", False)),
            "standards": result.get("standards", []),
            "evidence": result.get("evidence", ""),
        }
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM response as JSON: %s — raw: %s", exc, raw)
        return {"compliant": False, "standards": [], "evidence": ""}
    except openai.OpenAIError as exc:
        logger.error("OpenAI API error: %s", exc)
        return {"compliant": False, "standards": [], "evidence": ""}


def _to_aggregatable(r: dict) -> dict:
    """Ensure evidence is a string for aggregator compatibility."""
    return {
        "compliant": r.get("compliant", False),
        "standards": r.get("standards", []),
        "evidence": r.get("evidence", "") if isinstance(r.get("evidence"), str) else "",
    }
