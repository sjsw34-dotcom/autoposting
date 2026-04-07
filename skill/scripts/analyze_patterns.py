#!/usr/bin/env python3
"""
Competitor Analyzer - Pattern Analyzer
수집된 경쟁사 콘텐츠를 Claude API로 분석하여 패턴을 추출한다.

사용법:
    python analyze_patterns.py                    # 최신 raw_data 전체 분석
    python analyze_patterns.py --type x           # X 데이터만 분석
    python analyze_patterns.py --type web         # 웹 데이터만 분석
    python analyze_patterns.py --file path.json   # 특정 파일 분석

환경변수:
    ANTHROPIC_API_KEY: Claude API 키
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent.parent
RAW_X_DIR = SCRIPT_DIR / "evolves" / "raw_data" / "x"
RAW_WEB_DIR = SCRIPT_DIR / "evolves" / "raw_data" / "web"
EVOLVES_DIR = SCRIPT_DIR / "evolves"
PROMPTS_PATH = SCRIPT_DIR / "references" / "analysis_prompts.md"


def get_anthropic_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("[ERROR] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
        sys.exit(1)
    return key


def call_claude(api_key: str, system_prompt: str, user_prompt: str) -> dict:
    """Claude API 호출"""
    url = "https://api.anthropic.com/v1/messages"

    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}]
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            text = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    text += block.get("text", "")

            # Try to parse as JSON
            clean = text.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean
                clean = clean.rsplit("```", 1)[0]
                clean = clean.strip()

            try:
                return json.loads(clean)
            except json.JSONDecodeError:
                return {"raw_response": text, "parse_error": True}

    except urllib.error.URLError as e:
        print(f"  [ERROR] Claude API call failed: {e}")
        return {"error": str(e)}


def get_latest_file(directory: Path) -> Path | None:
    """디렉토리에서 가장 최근 JSON 파일을 반환"""
    if not directory.exists():
        return None
    files = sorted(directory.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
    return files[0] if files else None


def analyze_x_posts(api_key: str, data_path: Path) -> dict:
    """X 포스트 데이터 분석"""
    print(f"\n=== Analyzing X Posts: {data_path.name} ===")

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    posts = data.get("posts", [])
    if not posts:
        print("  [SKIP] No posts found")
        return {}

    # Group by handle
    by_handle = {}
    for post in posts:
        handle = post.get("handle", "unknown")
        if handle not in by_handle:
            by_handle[handle] = []
        by_handle[handle].append(post)

    all_analyses = {}
    for handle, handle_posts in by_handle.items():
        print(f"\n  --- @{handle} ({len(handle_posts)} posts) ---")

        # Prepare posts for analysis (top 30 by likes)
        sorted_posts = sorted(handle_posts, key=lambda p: p.get("likes", 0), reverse=True)[:30]
        posts_text = "\n\n---\n\n".join([
            f"[Likes: {p.get('likes', 0)} | RT: {p.get('retweets', 0)} | Views: {p.get('views', 0)}]\n{p.get('text', '')}"
            for p in sorted_posts
        ])

        system = "You are a content strategist analyzing social media posts for pattern extraction. Always respond with valid JSON only."
        user = f"""Analyze the following {len(sorted_posts)} posts from @{handle} and extract:

1. HOOK PATTERNS: Categorize each post's opening hook type (Question, Declaration, Number/List, Contrast, Direct address, Cultural reference). Count frequency of each.

2. TONE PROFILE: Rate overall tone (1-10): Witty, Mystical, Educational, Emotional, Provocative.

3. STRUCTURAL PATTERNS: avg char count, emoji usage, hashtag strategy, CTA style, line break usage.

4. ENGAGEMENT CORRELATION: Which patterns correlate with highest likes/retweets?

5. SAJU ADAPTATION: How to adapt top patterns for Korean astrology (Saju/Four Pillars). Give 5 specific post ideas.

POSTS:
{posts_text}

Return ONLY a JSON object."""

        result = call_claude(api_key, system, user)
        all_analyses[handle] = result
        print(f"  [DONE] Analysis complete for @{handle}")

    return all_analyses


def analyze_web_pages(api_key: str, data_path: Path) -> dict:
    """웹사이트 데이터 분석"""
    print(f"\n=== Analyzing Web Pages: {data_path.name} ===")

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pages = data.get("pages", [])
    if not pages:
        print("  [SKIP] No pages found")
        return {}

    # Prepare pages summary (truncate for token limits)
    pages_summary = "\n\n===PAGE===\n\n".join([
        f"URL: {p.get('url', '')}\nTitle: {p.get('title', '')}\nDescription: {p.get('description', '')}\nWord Count: {p.get('word_count', 0)}\nContent Preview: {p.get('text', '')[:1000]}"
        for p in pages[:15]  # limit to 15 pages
    ])

    system = "You are an SEO and content strategist analyzing competitor websites. Always respond with valid JSON only."
    user = f"""Analyze the following {min(len(pages), 15)} pages and extract:

1. SEO STRUCTURE: title patterns, meta description patterns, heading hierarchy, URL patterns, internal linking.

2. CONTENT STRUCTURE: intro style, section flow, paragraph length, CTA placement.

3. TOPIC COVERAGE: main categories, content depth, seasonal vs evergreen ratio.

4. KEYWORD GAPS FOR SAJU: topics they cover that Saju can angle on, topics they don't cover that Saju addresses, long-tail keyword opportunities for "korean astrology".

5. ACTIONABLE RECOMMENDATIONS: top 5 structural patterns for sajumuse.com, top 5 content ideas, SEO quick wins.

PAGES:
{pages_summary}

Return ONLY a JSON object."""

    result = call_claude(api_key, system, user)
    print(f"  [DONE] Web analysis complete")
    return result


def generate_judge_recommendations(api_key: str, x_analysis: dict, web_analysis: dict) -> dict:
    """분석 결과를 바탕으로 judge 기준 업데이트 권장사항 생성"""
    print("\n=== Generating Judge Recommendations ===")

    system = "You are a quality scoring system designer. Generate precise, actionable recommendations for updating content scoring criteria. Always respond with valid JSON only."
    user = f"""Based on competitor analysis results, generate recommendations to update SajuMuse's content judge scoring system.

CURRENT SCORING SYSTEM:
- Binary checks (60%): char count, emoji count, hashtags, em dash ban, CTA/link check, banned words
- LLM judge (40%): hook_power, saju_accuracy, english_fluency, action_driver, uniqueness (each 1-10)

X POST ANALYSIS:
{json.dumps(x_analysis, ensure_ascii=False)[:3000]}

WEB/BLOG ANALYSIS:
{json.dumps(web_analysis, ensure_ascii=False)[:3000]}

Generate:

1. BINARY_CHECK_UPDATES: Specific threshold changes with reasoning.
   Example: {{"emoji_max": {{"current": 3, "recommended": 2, "reason": "Top accounts use 1-2 max"}}}}

2. LLM_AXIS_UPDATES: New axes to add, weights to change, or axes to remove.
   Example: {{"add": [{{"name": "wit_factor", "weight": 1.2, "reason": "Co-Star's wit drives engagement"}}]}}

3. NEW_BINARY_CHECKS: Checks to add based on competitor patterns.

4. TOP_PERFORMING_PATTERNS: 10 specific content patterns to add to top-performing-posts.md as templates.

5. CONTENT_CALENDAR: 20 specific content ideas for next month, categorized by platform (X, Medium, Blog).

Return ONLY a JSON object."""

    result = call_claude(api_key, system, user)
    print("  [DONE] Recommendations generated")
    return result


def save_analysis(analysis: dict, filename: str):
    EVOLVES_DIR.mkdir(parents=True, exist_ok=True)
    filepath = EVOLVES_DIR / filename

    output = {
        "analyzed_at": datetime.now().isoformat(),
        "analysis": analysis
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  [SAVED] {filepath}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Pattern Analyzer")
    parser.add_argument("--type", choices=["x", "web", "all"], default="all")
    parser.add_argument("--file", help="Specific data file to analyze")
    args = parser.parse_args()

    api_key = get_anthropic_key()
    x_analysis = {}
    web_analysis = {}

    if args.file:
        filepath = Path(args.file)
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "posts" in data:
            x_analysis = analyze_x_posts(api_key, filepath)
        elif "pages" in data:
            web_analysis = analyze_web_pages(api_key, filepath)

    else:
        if args.type in ("x", "all"):
            latest_x = get_latest_file(RAW_X_DIR)
            if latest_x:
                x_analysis = analyze_x_posts(api_key, latest_x)
            else:
                print("[WARN] No X data found. Run crawl_x.py first.")

        if args.type in ("web", "all"):
            latest_web = get_latest_file(RAW_WEB_DIR)
            if latest_web:
                web_analysis = analyze_web_pages(api_key, latest_web)
            else:
                print("[WARN] No web data found. Run crawl_web.py first.")

    # Save individual analyses
    if x_analysis:
        save_analysis(x_analysis, "analysis_x.json")
    if web_analysis:
        save_analysis(web_analysis, "analysis_web.json")

    # Generate judge recommendations
    if x_analysis or web_analysis:
        recommendations = generate_judge_recommendations(api_key, x_analysis, web_analysis)
        save_analysis(recommendations, "recommendations.json")

        # Save analysis report (combined)
        full_report = {
            "x_patterns": x_analysis,
            "web_patterns": web_analysis,
            "recommendations": recommendations
        }
        save_analysis(full_report, "analysis_report.json")

        print("\n=== ANALYSIS COMPLETE ===")
        print("Files generated:")
        print(f"  - evolves/analysis_x.json")
        print(f"  - evolves/analysis_web.json")
        print(f"  - evolves/recommendations.json")
        print(f"  - evolves/analysis_report.json")
        print("\nNext step: Review recommendations.json and run update_judge.py to apply.")


if __name__ == "__main__":
    main()
