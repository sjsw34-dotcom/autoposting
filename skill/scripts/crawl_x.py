#!/usr/bin/env python3
"""
Competitor Analyzer - X/Twitter Crawler
Apify Tweet Scraper로 경쟁사 X 계정의 포스트를 수집한다.

사용법:
    python crawl_x.py                          # 모든 활성 계정 크롤링
    python crawl_x.py --handle coaboratory     # 특정 계정만
    python crawl_x.py --keyword "korean astrology"  # 키워드 검색
    python crawl_x.py --dry-run                # API 호출 없이 설정만 확인

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
OUTPUT_DIR = SCRIPT_DIR / "evolves" / "raw_data" / "x"


def load_config():
    with open(COMPETITORS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_apify_token():
    token = os.environ.get("APIFY_API_TOKEN")
    if not token:
        print("[ERROR] APIFY_API_TOKEN 환경변수가 설정되지 않았습니다.")
        print("  export APIFY_API_TOKEN='your_token_here'")
        sys.exit(1)
    return token


def run_twitter_scraper(token: str, handle: str, max_tweets: int, min_likes: int) -> list:
    """Apify Tweet Scraper Actor 실행"""
    actor_id = "apidojo~tweet-scraper"
    url = f"https://api.apify.com/v2/acts/{actor_id}/runs?token={token}"

    payload = json.dumps({
        "handles": [handle],
        "tweetsDesired": max_tweets,
        "addUserInfo": True,
        "proxyConfig": {"useApifyProxy": True}
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    print(f"  [API] Starting scrape for @{handle} ({max_tweets} tweets)...")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            run_data = json.loads(resp.read().decode("utf-8"))
            run_id = run_data["data"]["id"]
            print(f"  [API] Run started: {run_id}")
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to start run: {e}")
        return []

    # Poll for completion
    status_url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={token}"
    for attempt in range(60):  # max 5 minutes
        time.sleep(5)
        try:
            with urllib.request.urlopen(status_url, timeout=10) as resp:
                status_data = json.loads(resp.read().decode("utf-8"))
                status = status_data["data"]["status"]
                if status == "SUCCEEDED":
                    print(f"  [API] Run completed successfully")
                    break
                elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
                    print(f"  [ERROR] Run {status}")
                    return []
                else:
                    if attempt % 6 == 0:
                        print(f"  [API] Status: {status}...")
        except urllib.error.URLError:
            continue
    else:
        print("  [ERROR] Run timed out after 5 minutes")
        return []

    # Fetch results
    dataset_id = status_data["data"]["defaultDatasetId"]
    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={token}&format=json"

    try:
        with urllib.request.urlopen(dataset_url, timeout=30) as resp:
            items = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to fetch results: {e}")
        return []

    # Filter by min_likes
    filtered = []
    for item in items:
        likes = item.get("likeCount", item.get("favorite_count", 0))
        if likes >= min_likes:
            filtered.append({
                "text": item.get("full_text", item.get("text", "")),
                "likes": likes,
                "retweets": item.get("retweetCount", item.get("retweet_count", 0)),
                "replies": item.get("replyCount", item.get("reply_count", 0)),
                "views": item.get("viewCount", item.get("views", 0)),
                "created_at": item.get("createdAt", item.get("created_at", "")),
                "url": item.get("url", ""),
                "handle": handle
            })

    print(f"  [RESULT] {len(filtered)} tweets with {min_likes}+ likes (of {len(items)} total)")
    return filtered


def run_keyword_search(token: str, keyword: str, max_tweets: int) -> list:
    """키워드 기반 트윗 검색"""
    actor_id = "apidojo~tweet-scraper"
    url = f"https://api.apify.com/v2/acts/{actor_id}/runs?token={token}"

    payload = json.dumps({
        "searchTerms": [keyword],
        "tweetsDesired": max_tweets,
        "searchMode": "live",
        "addUserInfo": True,
        "proxyConfig": {"useApifyProxy": True}
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    print(f"  [API] Searching for '{keyword}' ({max_tweets} tweets)...")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            run_data = json.loads(resp.read().decode("utf-8"))
            run_id = run_data["data"]["id"]
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to start search: {e}")
        return []

    # Poll + fetch (same as above)
    status_url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={token}"
    for attempt in range(60):
        time.sleep(5)
        try:
            with urllib.request.urlopen(status_url, timeout=10) as resp:
                status_data = json.loads(resp.read().decode("utf-8"))
                status = status_data["data"]["status"]
                if status == "SUCCEEDED":
                    break
                elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
                    print(f"  [ERROR] Search {status}")
                    return []
        except urllib.error.URLError:
            continue
    else:
        return []

    dataset_id = status_data["data"]["defaultDatasetId"]
    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={token}&format=json"

    try:
        with urllib.request.urlopen(dataset_url, timeout=30) as resp:
            items = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to fetch search results: {e}")
        return []

    results = []
    for item in items:
        results.append({
            "text": item.get("full_text", item.get("text", "")),
            "likes": item.get("likeCount", item.get("favorite_count", 0)),
            "retweets": item.get("retweetCount", item.get("retweet_count", 0)),
            "replies": item.get("replyCount", item.get("reply_count", 0)),
            "views": item.get("viewCount", item.get("views", 0)),
            "created_at": item.get("createdAt", item.get("created_at", "")),
            "url": item.get("url", ""),
            "handle": item.get("author", {}).get("userName", "unknown"),
            "keyword": keyword
        })

    print(f"  [RESULT] {len(results)} tweets found for '{keyword}'")
    return results


def save_results(results: list, label: str):
    """결과를 파일로 저장"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{label}_{timestamp}.json"
    filepath = OUTPUT_DIR / filename

    output = {
        "crawled_at": datetime.now().isoformat(),
        "label": label,
        "count": len(results),
        "posts": results
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  [SAVED] {filepath}")
    return filepath


def main():
    import argparse
    parser = argparse.ArgumentParser(description="X/Twitter Competitor Crawler")
    parser.add_argument("--handle", help="Specific handle to crawl")
    parser.add_argument("--keyword", help="Keyword to search")
    parser.add_argument("--dry-run", action="store_true", help="Show config without API calls")
    parser.add_argument("--max-tweets", type=int, default=None, help="Override max tweets")
    args = parser.parse_args()

    config = load_config()
    settings = config["scrape_settings"]

    if args.dry_run:
        print("=== DRY RUN - Configuration ===")
        print(f"Active accounts: {[a['handle'] for a in config['x_accounts'] if a['active']]}")
        print(f"Keywords: {config['keyword_tracking']}")
        print(f"Tweets per account: {settings['x_tweets_per_account']}")
        print(f"Min likes filter: {settings['x_min_likes']}")
        return

    token = get_apify_token()

    if args.keyword:
        # Keyword search mode
        max_tweets = args.max_tweets or 100
        results = run_keyword_search(token, args.keyword, max_tweets)
        if results:
            save_results(results, f"keyword_{args.keyword.replace(' ', '_')}")

    elif args.handle:
        # Single account mode
        account = next(
            (a for a in config["x_accounts"] if a["handle"] == args.handle),
            None
        )
        max_tweets = args.max_tweets or (account["scrape_count"] if account else 50)
        min_likes = settings["x_min_likes"]
        results = run_twitter_scraper(token, args.handle, max_tweets, min_likes)
        if results:
            save_results(results, f"account_{args.handle}")

    else:
        # All active accounts
        all_results = []
        for account in config["x_accounts"]:
            if not account["active"]:
                continue
            print(f"\n--- @{account['handle']} ({account['name']}) ---")
            max_tweets = args.max_tweets or account["scrape_count"]
            min_likes = settings["x_min_likes"]
            results = run_twitter_scraper(
                token, account["handle"], max_tweets, min_likes
            )
            all_results.extend(results)
            if results:
                save_results(results, f"account_{account['handle']}")
            time.sleep(2)  # rate limit courtesy

        # Also run keyword searches
        print("\n--- Keyword Searches ---")
        for keyword in config["keyword_tracking"]:
            results = run_keyword_search(token, keyword, 30)
            all_results.extend(results)
            if results:
                save_results(results, f"keyword_{keyword.replace(' ', '_')}")
            time.sleep(2)

        # Save combined results
        if all_results:
            save_results(all_results, "combined_all")

        print(f"\n=== CRAWL COMPLETE ===")
        print(f"Total posts collected: {len(all_results)}")


if __name__ == "__main__":
    main()
