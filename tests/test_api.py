"""Tests for the FastAPI endpoints."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from api.routes import app

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_result_not_found():
    with patch("api.routes.get_cached_result", return_value=None):
        resp = client.get("/result/nonexistent.com")
        assert resp.status_code == 404


def test_result_found():
    mock_result = {
        "domain": "stripe.com",
        "compliant": True,
        "standards": ["SOC 2"],
        "evidence": ["SOC 2 Type II certified"],
        "pages_crawled": 5,
        "source_urls": ["https://stripe.com/security"],
    }
    with patch("api.routes.get_cached_result", return_value=mock_result):
        resp = client.get("/result/stripe.com")
        assert resp.status_code == 200
        data = resp.json()
        assert data["compliant"] is True
        assert "SOC 2" in data["standards"]


def test_check_endpoint():
    mock_result = {
        "domain": "example.com",
        "compliant": False,
        "standards": [],
        "evidence": [],
        "pages_crawled": 3,
        "source_urls": ["https://example.com/security"],
    }
    with patch("api.routes.check_domain", return_value=mock_result):
        resp = client.post("/check", json={"domain": "example.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["domain"] == "example.com"
