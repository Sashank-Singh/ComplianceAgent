"""Tests for aggregator.combine module."""

from aggregator.combine import aggregate


def test_no_results():
    result = aggregate([])
    assert result["compliant"] is False
    assert result["standards"] == []
    assert result["evidence"] == []


def test_single_compliant_chunk():
    chunks = [{"compliant": True, "standards": ["SOC 2"], "evidence": "We are SOC 2 certified"}]
    result = aggregate(chunks)
    assert result["compliant"] is True
    assert "SOC 2" in result["standards"]
    assert len(result["evidence"]) == 1


def test_mixed_results():
    chunks = [
        {"compliant": False, "standards": [], "evidence": ""},
        {"compliant": True, "standards": ["GDPR"], "evidence": "GDPR compliant"},
        {"compliant": True, "standards": ["ISO 27001", "GDPR"], "evidence": "ISO 27001 certified"},
    ]
    result = aggregate(chunks)
    assert result["compliant"] is True
    assert "GDPR" in result["standards"]
    assert "ISO 27001" in result["standards"]
    assert len(result["evidence"]) == 2


def test_deduplicates_standards():
    chunks = [
        {"compliant": True, "standards": ["SOC 2", "HIPAA"], "evidence": "a"},
        {"compliant": True, "standards": ["soc 2", "HIPAA"], "evidence": "b"},
    ]
    result = aggregate(chunks)
    # SOC 2 should appear only once (case-insensitive dedup)
    soc_count = sum(1 for s in result["standards"] if s.upper() == "SOC 2")
    assert soc_count == 1


def test_all_non_compliant():
    chunks = [
        {"compliant": False, "standards": [], "evidence": ""},
        {"compliant": False, "standards": [], "evidence": ""},
    ]
    result = aggregate(chunks)
    assert result["compliant"] is False
    assert result["standards"] == []
    assert result["evidence"] == []
