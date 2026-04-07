#!/usr/bin/env python3
"""
Competitor Analyzer - Website Crawler
Apify Website Content Crawler로 경쟁사 블로그/사이트를 수집한다.

사용법:
    python crawl_web.py                           # 모든 활성 사이트 크롤링
    python crawl_web.py --site cafeastrology.com   # 특정 사이트만
    python crawl_web.py --dry-run                  # 설정 확인만

환경변수:
    APIFY_API_TOKEN: Apify API 토큰
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent.parent
COMPETITORS_PATH = SCRIPT_DIR / "references" / "competitors.json"
OUTPUT_DIR = SCRIPT_DIR / "evolves" / "raw_data" / "web"


def load_config():
    with open(COMPETITORS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_apify_token():
    token = os.environ.get("APIFY_API_TOKEN")
    if not token:
        print("[ERROR] APIFY_API_TOKEN 환경변수가 설정되지 않았습니다.")
        sys.exit(1)
    return token


def run_web_crawler(token: str, base_url: str, crawl_paths: list, max_pages: int) -> list:
    """Apify Website Content Crawler 실행"""
    actor_id = "apify~website-content-crawler"
    url = f"https://api.apify.com/v2/acts/{actor_id}/runs?token={token}"

    # Build start URLs from base + paths
    start_urls = []
    for path in crawl_paths:
        full_url = base_url.rstrip("/") + path
        start_urls.append({"url": full_url})

    payload = json.dumps({
        "startUrls": start_urls,
        "maxCrawlPages": max_pages,
        "crawlerType": "cheerio",
        "includeUrlGlobs": [f"{base_url}/**"],
        "excludeUrlGlobs": [
            "**/*.pdf", "**/*.jpg", "**/*.png",
            "**/tag/**", "**/author/**", "**/page/**"
        ],
        "removeElementsCssSelector": "nav, footer, header, .sidebar, .ad, .comments, script, style",
        "proxyConfiguration": {"useApifyProxy": True}
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    domain = base_url.replace("https://", "").replace("http://", "").split("/")[0]
    print(f"  [API] Starting crawl for {domain} (max {max_pages} pages)...")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            run_data = json.loads(resp.read().decode("utf-8"))
            run_id = run_data["data"]["id"]
            print(f"  [API] Run started: {run_id}")
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to start crawl: {e}")
        return []

    # Poll for completion (web crawls can take longer)
    status_url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={token}"
    for attempt in range(120):  # max 10 minutes
        time.sleep(5)
        try:
            with urllib.request.urlopen(status_url, timeout=10) as resp:
                status_data = json.loads(resp.read().decode("utf-8"))
                status = status_data["data"]["status"]
                if status == "SUCCEEDED":
                    print(f"  [API] Crawl completed")
                    break
                elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
                    print(f"  [ERROR] Crawl {status}")
                    return []
                else:
                    if attempt % 12 == 0:
                        print(f"  [API] Status: {status}...")
        except urllib.error.URLError:
            continue
    else:
        print("  [ERROR] Crawl timed out after 10 minutes")
        return []

    # Fetch results
    dataset_id = status_data["data"]["defaultDatasetId"]
    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={token}&format=json"

    try:
        with urllib.request.urlopen(dataset_url, timeout=60) as resp:
            items = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to fetch results: {e}")
        return []

    # Extract relevant fields
    pages = []
    for item in items:
        text = item.get("text", "")
        if len(text) < 200:  # skip thin pages
            continue
        pages.append({
            "url": item.get("url", ""),
            "title": item.get("metadata", {}).get("title", item.get("title", "")),
            "description": item.get("metadata", {}).get("description", ""),
            "text": text[:5000],  # truncate to save space
            "word_count": len(text.split()),
            "h1": item.get("metadata", {}).get("h1", ""),
            "crawled_at": datetime.now().isoformat()
        })

    print(f"  [RESULT] {len(pages)} pages extracted (of {len(items)} crawled)")
    return pages


def save_results(results: list, label: str):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{label}_{timestamp}.json"
    filepath = OUTPUT_DIR / filename

    output = {
        "crawled_at": datetime.now().isoformat(),
        "label": label,
        "count": len(results),
        "pages": results
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  [SAVED] {filepath}")
    return filepath


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Website Competitor Crawler")
    parser.add_argument("--site", help="Specific site domain to crawl")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-pages", type=int, default=None)
    args = parser.parse_args()

    config = load_config()

    if args.dry_run:
        print("=== DRY RUN - Configuration ===")
        for site in config["websites"]:
            status = "ACTIVE" if site["active"] else "INACTIVE"
            print(f"  [{status}] {site['name']} - {site['url']}")
            print(f"    Paths: {site['crawl_paths']}")
            print(f"    Max pages: {site['max_pages']}")
        return

    token = get_apify_token()

    if args.site:
        site = next(
            (s for s in config["websites"] if args.site in s["url"]),
            None
        )
        if not site:
            print(f"[ERROR] Site '{args.site}' not found in competitors.json")
            sys.exit(1)
        max_pages = args.max_pages or site["max_pages"]
        results = run_web_crawler(token, site["url"], site["crawl_paths"], max_pages)
        if results:
            label = site["name"].lower().replace(" ", "_")
            save_results(results, f"site_{label}")
    else:
        all_results = []
        for site in config["websites"]:
            if not site["active"]:
                continue
            print(f"\n--- {site['name']} ({site['url']}) ---")
            max_pages = args.max_pages or site["max_pages"]
            results = run_web_crawler(
                token, site["url"], site["crawl_paths"], max_pages
            )
            all_results.extend(results)
            if results:
                label = site["name"].lower().replace(" ", "_")
                save_results(results, f"site_{label}")
            time.sleep(3)

        if all_results:
            save_results(all_results, "combined_all_sites")

        print(f"\n=== CRAWL COMPLETE ===")
        print(f"Total pages collected: {len(all_results)}")


if __name__ == "__main__":
    main()
