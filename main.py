#!/usr/bin/env python3
"""Compliance Checking Agent — CLI demo and FastAPI launcher.

Usage:
    # Start everything (backend + frontend + open browser):
    python main.py start

    # Run a single domain check from the command line:
    python main.py check stripe.com

    # Start the API server only:
    python main.py serve

    # Check multiple domains:
    python main.py check stripe.com datadog.com cloudflare.com
"""

import argparse
import json
import logging
import sys

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("compliance-agent")


def run_check(domains: list[str], max_depth: int = 2, use_spa: bool = False) -> None:
    """Execute the full compliance pipeline for one or more domains."""
    from classifier.classify import classify_document
    from crawler.bfs import bfs_crawl
    from crawler.seed import generate_seeds, normalize_domain

    for raw_domain in domains:
        domain = normalize_domain(raw_domain)
        print(f"\n{'='*60}")
        print(f"  Compliance Check: {domain}")
        print(f"{'='*60}")

        print(f"\n[1/3] Generating seed URLs for {domain}...")
        seeds = generate_seeds(domain)
        for s in seeds:
            print(f"       {s}")

        print(f"\n[2/3] Starting BFS crawl (max_depth={max_depth})...")
        pages = bfs_crawl(seeds, domain, max_depth=max_depth, use_spa=use_spa)
        print(f"       Crawled {len(pages)} pages")

        print(f"\n[3/3] Classifying document (1–2 API calls)...")
        doc_parts = [f"--- {url} ---\n\n{text}" for url, text in pages]
        full_text = "\n\n".join(doc_parts)
        final = classify_document(full_text)
        if final["compliant"]:
            print(f"       ✓ Found: {', '.join(final['standards'])}")
        final["domain"] = domain
        final["pages_crawled"] = len(pages)
        final["source_urls"] = [url for url, _ in pages]

        print(f"\n{'─'*60}")
        print(f"  RESULT: {domain}")
        print(f"  Compliant: {final['compliant']}")
        print(f"  Standards: {', '.join(final['standards']) or 'None detected'}")
        print(f"  Evidence:  {len(final['evidence'])} snippets")
        print(f"  Pages:     {final['pages_crawled']}")
        print(f"{'─'*60}")
        print(json.dumps(final, indent=2))


def run_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    """Start the FastAPI server."""
    import uvicorn

    from api.routes import app

    logger.info("Starting API server on %s:%d", host, port)
    uvicorn.run(app, host=host, port=port)


def main() -> None:
    parser = argparse.ArgumentParser(description="Compliance Checking Agent")
    sub = parser.add_subparsers(dest="command")

    # -- check subcommand --
    check_parser = sub.add_parser("check", help="Run compliance check on domain(s)")
    check_parser.add_argument("domains", nargs="+", help="Domain(s) to check")
    check_parser.add_argument("--depth", type=int, default=1, help="BFS crawl depth (default 1 = fewer pages, 1–2 API calls)")
    check_parser.add_argument("--spa", action="store_true", help="Enable Playwright SPA fallback")

    # -- serve subcommand --
    serve_parser = sub.add_parser("serve", help="Start the FastAPI server")
    serve_parser.add_argument("--host", default="0.0.0.0", help="Bind host")
    serve_parser.add_argument("--port", type=int, default=8000, help="Bind port")

    # -- start subcommand --
    sub.add_parser("start", help="Start backend + frontend together and open browser")

    args = parser.parse_args()

    if args.command == "check":
        run_check(args.domains, max_depth=args.depth, use_spa=args.spa)
    elif args.command == "serve":
        run_server(host=args.host, port=args.port)
    elif args.command == "start":
        import os
        import subprocess

        script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "start.sh")
        subprocess.run(["bash", script])
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
