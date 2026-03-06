# ComplianceAgent

An automated compliance-checking agent that crawls company websites to detect claims of security and privacy standard compliance (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, and more).

Given a company domain, the agent seeds compliance-relevant URLs, crawls pages via BFS, extracts and chunks text content, classifies each chunk with an LLM, and aggregates the results into a final compliance verdict.

## Architecture

```
Input: Company Domain
        │
        ▼
┌───────────────────┐
│  Domain Resolver   │  ← normalize input
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ URL Seed Generator │  ← /security /trust /privacy /legal /compliance
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   BFS Crawler      │  ← depth limit 2-3, static (BS4) + SPA (Playwright)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Content Extractor  │  ← strip HTML noise, extract main content
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│     Chunker        │  ← 2.5k word chunks with overlap
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  LLM Classifier    │  ← per chunk: compliant? standards? evidence?
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Result Aggregator  │  ← any chunk compliant → domain compliant
└────────┬──────────┘
         │
         ▼
Output: { domain, compliant, standards, evidence, source_urls }
```

## Project Structure

```
compliance-agent/
├── main.py                  ← CLI entry point + API launcher
├── api/
│   └── routes.py            ← FastAPI REST endpoints
├── crawler/
│   ├── seed.py              ← seed URL generation from domain
│   ├── static_crawler.py    ← BeautifulSoup + requests crawler
│   ├── spa_crawler.py       ← Playwright headless browser crawler
│   └── bfs.py               ← BFS crawl with depth limiting
├── extractor/
│   ├── cleaner.py           ← HTML cleaning and main content extraction
│   └── chunker.py           ← text splitting into LLM-sized chunks
├── classifier/
│   ├── prompt.py            ← LLM prompt templates
│   └── classify.py          ← OpenAI API classification logic
├── aggregator/
│   └── combine.py           ← merge chunk-level results
├── queue/
│   └── worker.py            ← Redis Queue worker for async processing
├── cache/
│   └── store.py             ← Redis cache for results
├── tests/                   ← unit tests
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Tech Stack

| Layer              | Tool                          |
|--------------------|-------------------------------|
| Language           | Python 3.11                   |
| Static crawling    | BeautifulSoup + requests      |
| SPA crawling       | Playwright (headless Chromium) |
| LLM classification | OpenAI API (gpt-4o-mini)      |
| Queue              | Redis + RQ                    |
| Cache              | Redis                         |
| API                | FastAPI                        |
| Containerization   | Docker + Docker Compose        |

## Quick Start

### Prerequisites

- Python 3.11+
- An OpenAI API key
- Redis (optional, for caching/queue — not needed for CLI mode)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/Sashank-Singh/ComplianceAgent.git
cd ComplianceAgent

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers (needed for SPA crawling)
playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### CLI Usage

```bash
# Check a single domain
python main.py check stripe.com

# Check multiple domains
python main.py check stripe.com datadog.com cloudflare.com

# Enable SPA rendering for JS-heavy sites
python main.py check example.com --spa

# Adjust crawl depth
python main.py check stripe.com --depth 3
```

### API Server

```bash
# Start the FastAPI server
python main.py serve

# Or with custom host/port
python main.py serve --host 0.0.0.0 --port 8080
```

### API Endpoints

| Method | Path              | Description                               |
|--------|-------------------|-------------------------------------------|
| GET    | `/health`         | Health check                              |
| POST   | `/check`          | Synchronous compliance check              |
| POST   | `/enqueue`        | Queue an async compliance check           |
| GET    | `/result/{domain}`| Retrieve cached result for a domain       |

#### Example Request

```bash
curl -X POST http://localhost:8000/check \
  -H "Content-Type: application/json" \
  -d '{"domain": "stripe.com", "max_depth": 2}'
```

#### Example Response

```json
{
  "domain": "stripe.com",
  "compliant": true,
  "standards": ["SOC 2", "PCI DSS", "ISO 27001"],
  "evidence": ["SOC 2 Type II certified", "PCI Level 1 service provider"],
  "pages_crawled": 12,
  "source_urls": ["https://stripe.com/security", "https://stripe.com/privacy"]
}
```

### Docker

```bash
# Build and start all services (API + worker + Redis)
docker compose up --build

# Run in detached mode
docker compose up --build -d
```

## How It Works

1. **Seed Generation** — Given a domain like `stripe.com`, the agent generates URLs targeting common compliance pages (`/security`, `/trust`, `/privacy`, `/legal`, `/compliance`, etc.).

2. **BFS Crawling** — Starting from seed URLs, the crawler follows same-domain links up to a configurable depth (default: 2). Static pages use BeautifulSoup; JS-heavy SPAs fall back to Playwright.

3. **Content Extraction** — Raw HTML is cleaned (scripts, styles, nav removed) and the main content area is extracted. Text is then split into ~2,500 word chunks with overlap to preserve context.

4. **LLM Classification** — Each chunk is sent to GPT-4o-mini with a structured prompt asking whether the text claims compliance with SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, or other standards. The LLM returns structured JSON.

5. **Aggregation** — If any chunk reports compliance, the domain is marked compliant. Standards are de-duplicated and evidence snippets are collected.

6. **Caching** — Results are stored in Redis (24h TTL) to avoid re-crawling.

## Edge Cases & Mitigations

| Edge Case            | Mitigation                                    |
|----------------------|-----------------------------------------------|
| Rate limiting        | Random delays, exponential back-off, UA rotation |
| JS-heavy SPAs        | Playwright headless browser fallback          |
| Blocked crawlers     | Rotating user agents, polite delay            |
| Long pages           | Chunking into 2.5k word segments with overlap |
| Localized URLs       | Optional locale prefix generation             |
| False positives      | Strict prompt: require explicit standard names |
| API key exposure     | Environment variables, never hardcoded         |

## Running Tests

```bash
pytest tests/ -v
```

## Scaling to 10k+ Domains

1. Use the `/enqueue` endpoint to push domains onto the Redis queue
2. Scale the `worker` service horizontally in Docker Compose
3. Results are cached in Redis — subsequent checks skip crawling
4. Each worker processes domains independently and in parallel
