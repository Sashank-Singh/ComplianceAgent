"""LLM-based compliance classification for text chunks."""

import json
import logging
import os

import openai

from classifier.prompt import CLASSIFICATION_PROMPT

logger = logging.getLogger(__name__)

# Defaults — override via environment variables
DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TEMPERATURE = 0.0
DEFAULT_MAX_TOKENS = 512


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
