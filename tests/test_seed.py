"""Tests for crawler.seed module."""

from crawler.seed import generate_seeds, normalize_domain


def test_normalize_domain_plain():
    assert normalize_domain("stripe.com") == "stripe.com"


def test_normalize_domain_with_protocol():
    assert normalize_domain("https://stripe.com") == "stripe.com"


def test_normalize_domain_trailing_slash():
    assert normalize_domain("stripe.com/") == "stripe.com"


def test_generate_seeds_returns_expected_paths():
    seeds = generate_seeds("stripe.com")
    assert any("/security" in url for url in seeds)
    assert any("/privacy" in url for url in seeds)
    assert any("/compliance" in url for url in seeds)
    assert all(url.startswith("https://stripe.com") for url in seeds)


def test_generate_seeds_with_locales():
    seeds = generate_seeds("example.com", include_locales=True)
    assert any("/en/security" in url for url in seeds)
    assert any("/de/privacy" in url for url in seeds)
    assert len(seeds) > len(generate_seeds("example.com", include_locales=False))
