"""Tests for extractor.chunker module."""

from extractor.chunker import chunk_text


def test_empty_text():
    assert chunk_text("") == []


def test_short_text_single_chunk():
    text = "hello world foo bar"
    chunks = chunk_text(text, chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunking_splits_correctly():
    words = [f"word{i}" for i in range(100)]
    text = " ".join(words)
    chunks = chunk_text(text, chunk_size=30, overlap=5)
    # Should have multiple chunks
    assert len(chunks) > 1
    # Each chunk (except possibly last) should have ~30 words
    first_words = chunks[0].split()
    assert len(first_words) == 30


def test_overlap_creates_shared_words():
    words = [f"w{i}" for i in range(60)]
    text = " ".join(words)
    chunks = chunk_text(text, chunk_size=30, overlap=10)
    # The end of chunk 0 should overlap with the start of chunk 1
    c0_words = chunks[0].split()
    c1_words = chunks[1].split()
    # Last 10 words of chunk 0 should appear at start of chunk 1
    assert c0_words[-10:] == c1_words[:10]
