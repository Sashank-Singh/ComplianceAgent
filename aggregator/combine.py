"""Aggregate per-chunk classification results into a final domain verdict."""


def aggregate(chunk_results: list[dict]) -> dict:
    """Merge results from multiple chunk classifications.

    Logic: if *any* chunk reports compliance, the domain is marked compliant.
    Standards and evidence are de-duplicated and collected.

    Args:
        chunk_results: List of dicts from classify_chunk().

    Returns:
        Aggregated result dict with compliant, standards, and evidence fields.
    """
    compliant = any(r.get("compliant", False) for r in chunk_results)

    # De-duplicate standards (preserve order)
    seen_standards: set[str] = set()
    standards: list[str] = []
    for r in chunk_results:
        for s in r.get("standards", []):
            normalized = s.strip().upper()
            if normalized not in seen_standards:
                seen_standards.add(normalized)
                standards.append(s.strip())

    evidence = [
        r["evidence"]
        for r in chunk_results
        if r.get("compliant") and r.get("evidence")
    ]

    return {
        "compliant": compliant,
        "standards": standards,
        "evidence": evidence,
    }
