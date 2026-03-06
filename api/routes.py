"""FastAPI REST endpoints for the Compliance Checking Agent."""

import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from cache.store import get_cached_result
from queue_worker.worker import check_domain, enqueue_domain

app = FastAPI(
    title="Compliance Checking Agent",
    description="Automated compliance verification for company domains",
    version="1.0.0",
)


# ── Request / Response Models ────────────────────────────────────────────────

class CheckRequest(BaseModel):
    domain: str = Field(..., example="stripe.com", description="Company domain to check")
    max_depth: int = Field(default=2, ge=1, le=5, description="BFS crawl depth")
    use_spa: bool = Field(default=False, description="Use Playwright for JS-heavy pages")


class CheckResponse(BaseModel):
    domain: str
    compliant: bool
    standards: list[str]
    evidence: list[str]
    pages_crawled: int
    source_urls: list[str]


class EnqueueResponse(BaseModel):
    job_id: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    """Health check endpoint."""
    return HealthResponse(status="ok", version="1.0.0")


@app.post("/check", response_model=CheckResponse)
def check(req: CheckRequest):
    """Run a synchronous compliance check on a domain.

    This will crawl, extract, classify, and return results directly.
    For large-scale usage, prefer the /enqueue endpoint.
    """
    try:
        result = check_domain(req.domain, max_depth=req.max_depth, use_spa=req.use_spa)
        return CheckResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/enqueue", response_model=EnqueueResponse)
def enqueue(req: CheckRequest):
    """Push a compliance check onto the Redis job queue.

    Returns a job ID that can be polled via /result/{domain}.
    """
    try:
        job_id = enqueue_domain(req.domain)
        return EnqueueResponse(job_id=job_id, message=f"Queued compliance check for {req.domain}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/result/{domain}", response_model=CheckResponse | None)
def get_result(domain: str):
    """Retrieve a cached compliance result for a domain.

    Returns 404 if no result has been cached yet.
    """
    result = get_cached_result(domain)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No cached result for {domain}")
    return CheckResponse(**result)
