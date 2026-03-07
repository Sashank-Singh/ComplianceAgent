"""FastAPI REST endpoints for the Compliance Checking Agent."""

import json
import os
import queue
import threading

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from cache.store import get_cached_result
from queue_worker.worker import check_domain, enqueue_domain

app = FastAPI(
    title="Compliance Checking Agent",
    description="Automated compliance verification for company domains",
    version="1.0.0",
)

# CORS: allow frontend origin. In production, set CORS_ORIGINS (comma-separated).
_default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
if _cors_origins:
    _default_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/check/stream")
def check_stream(
    domain: str = Query(..., description="Domain to check"),
    max_depth: int = Query(default=2, ge=1, le=5),
    use_spa: bool = Query(default=False),
):
    """SSE endpoint that streams real-time progress events during a compliance check.

    Events:
      - ``seeds``    — seed URLs generated
      - ``crawl``    — a page is being fetched or was fetched
      - ``classify`` — classification started
      - ``result``   — final result payload
      - ``error``    — pipeline error
    """
    event_queue: queue.Queue[dict | None] = queue.Queue()

    def on_progress(event_type: str, data: dict) -> None:
        event_queue.put({"event": event_type, "data": data})

    def run_pipeline() -> None:
        try:
            result = check_domain(
                domain, max_depth=max_depth, use_spa=use_spa,
                on_progress=on_progress,
            )
            event_queue.put({"event": "result", "data": result})
        except Exception as exc:
            event_queue.put({"event": "error", "data": {"message": str(exc)}})
        finally:
            event_queue.put(None)  # sentinel

    threading.Thread(target=run_pipeline, daemon=True).start()

    def event_generator():
        while True:
            msg = event_queue.get()
            if msg is None:
                break
            yield f"data: {json.dumps(msg)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
