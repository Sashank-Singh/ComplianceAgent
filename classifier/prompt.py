"""Prompt templates for the LLM compliance classifier."""

CLASSIFICATION_PROMPT = """You are a compliance analyst. Analyze the following text and determine whether the company claims compliance with any of these security/privacy standards:

- SOC 2 (Type I or Type II)
- ISO 27001
- GDPR
- HIPAA
- PCI DSS
- SOC 1
- FedRAMP
- CCPA

Instructions:
1. Only mark a standard as claimed if the text explicitly states compliance, certification, or adherence.
2. Marketing language like "we take security seriously" without naming a standard does NOT count.
3. Extract a short evidence quote (max 150 chars) for each claimed standard.

Respond ONLY with valid JSON in this exact format — no markdown, no commentary:
{{"compliant": true/false, "standards": ["STANDARD_NAME", ...], "evidence": "short quote from the text"}}

Text:
{text}"""
