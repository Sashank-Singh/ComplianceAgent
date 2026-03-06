"""Split text into token-approximate chunks for LLM classification."""


def chunk_text(text: str, chunk_size: int = 2500, overlap: int = 200) -> list[str]:
    """Split *text* into word-based chunks of roughly *chunk_size* words.

    An overlap window helps preserve context across chunk boundaries.

    Args:
        text: Input text to split.
        chunk_size: Target number of words per chunk.
        overlap: Number of overlapping words between consecutive chunks.

    Returns:
        List of text chunks.
    """
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start = end - overlap  # step back by overlap

    return chunks
