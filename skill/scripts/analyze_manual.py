#!/usr/bin/env python3
"""
Competitor Analyzer - Manual Content Analyzer
마스터가 직접 URL이나 텍스트를 입력하여 분석하는 수동 모드.
Medium 등 API 없는 플랫폼 대응용.

사용법:
    python analyze_manual.py --url "https://medium.com/some-article"
    python analyze_manual.py --text "포스트 내용을 여기에"
    python analyze_manual.py --file content.txt
    python analyze_manual.py --clipboard  # 클립보드에서 읽기

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
EVOLVES_DIR = SCRIPT_DIR / "evolves"
MANUAL_DIR = EVOLVES_DIR / "manual_analyses"


def get_anthropic_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("[ERROR] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
        sys.exit(1)
    return key


def fetch_url_content(url: str) -> str:
    """URL에서 텍스트 콘텐츠 추출"""
    print(f"  [FETCH] {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except urllib.error.URLError as e:
        print(f"  [ERROR] Failed to fetch URL: {e}")
        return ""

    # Simple HTML to text extraction
    import re
    # Remove script/style
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Extract title
    title_match = re.search(r"<title[^>]*>(.*?)</title>", text, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else ""
    # Extract meta description
    meta_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', text, re.IGNORECASE)
    meta_desc = meta_match.group(1).strip() if meta_match else ""
    # Extract headings
    headings = re.findall(r"<h[1-3][^>]*>(.*?)</h[1-3]>", text, re.IGNORECASE | re.DOTALL)
    headings = [re.sub(r"<[^>]+>", "", h).strip() for h in headings]
    # Strip all HTML tags for body
    body = re.sub(r"<[^>]+>", " ", text)
    body = re.sub(r"\s+", " ", body).strip()

    result = f"TITLE: {title}\nMETA: {meta_desc}\nHEADINGS: {' | '.join(headings[:10])}\n\nBODY:\n{body[:5000]}"
    print(f"  [FETCH] Extracted {len(body.split())} words")
    return result


def call_claude(api_key: str, content: str, source: str) -> dict:
    """Claude API로 콘텐츠 분석"""
    url = "https://api.anthropic.com/v1/messages"

    system = "You are a content strategist analyzing competitor content for SajuMuse, a Korean Four Pillars of Destiny brand. Always respond with valid JSON only."

    user = f"""Analyze this content from {source} and provide actionable insights for SajuMuse:

CONTENT:
---
{content[:4000]}
---

Return a JSON object with:

1. "what_works": {{
     "hook_effectiveness": 1-10 score with reason,
     "tone_characteristics": description of voice/tone,
     "structural_strengths": what makes this content engaging,
     "cta_effectiveness": how well it drives action
   }}

2. "saju_adaptation": {{
     "pattern_to_recreate": the core pattern that can be reused,
     "saju_topics_that_fit": 3 Saju topics this format works for,
     "korean_culture_angles": unique angles from Korean perspective,
     "differentiation_points": how SajuMuse can be better
   }}

3. "judge_recommendations": {{
     "binary_check_adjustments": any thresholds to change,
     "llm_axis_adjustments": any scoring axes to tweak,
     "new_patterns": new patterns to add to scoring
   }}

4. "content_ideas": [
     5 specific post/article ideas inspired by this content, adapted for Saju
   ]

5. "key_takeaway": one sentence summary of the most important lesson

Return ONLY a JSON object. No markdown."""

    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": system,
        "messages": [{"role": "user", "content": user}]
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

    print("  [API] Analyzing with Claude...")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            text = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    text += block.get("text", "")

            clean = text.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean
                clean = clean.rsplit("```", 1)[0].strip()

            try:
                return json.loads(clean)
            except json.JSONDecodeError:
                return {"raw_response": text, "parse_error": True}

    except urllib.error.URLError as e:
        return {"error": str(e)}


def save_result(result: dict, source: str, content_preview: str):
    MANUAL_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Clean source for filename
    label = source.replace("https://", "").replace("http://", "")
    label = label.replace("/", "_").replace(".", "_")[:50]

    filename = f"manual_{label}_{timestamp}.json"
    filepath = MANUAL_DIR / filename

    output = {
        "analyzed_at": datetime.now().isoformat(),
        "source": source,
        "content_preview": content_preview[:200],
        "analysis": result
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  [SAVED] {filepath}")

    # Also append to cumulative analysis report
    report_path = EVOLVES_DIR / "analysis_report.json"
    if report_path.exists():
        with open(report_path, "r", encoding="utf-8") as f:
            report = json.load(f)
    else:
        report = {"analyzed_at": "", "analysis": {"manual_analyses": []}}

    if "manual_analyses" not in report.get("analysis", {}):
        report["analysis"]["manual_analyses"] = []

    report["analysis"]["manual_analyses"].append({
        "source": source,
        "date": datetime.now().isoformat(),
        "key_takeaway": result.get("key_takeaway", ""),
        "content_ideas": result.get("content_ideas", [])
    })
    report["analyzed_at"] = datetime.now().isoformat()

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"  [UPDATED] {report_path}")
    return filepath


def print_summary(result: dict):
    """분석 결과 요약 출력"""
    print("\n" + "=" * 60)
    print("ANALYSIS SUMMARY")
    print("=" * 60)

    if "key_takeaway" in result:
        print(f"\nKey Takeaway: {result['key_takeaway']}")

    if "what_works" in result:
        ww = result["what_works"]
        print(f"\nHook Effectiveness: {ww.get('hook_effectiveness', 'N/A')}")
        print(f"Tone: {ww.get('tone_characteristics', 'N/A')}")

    if "content_ideas" in result:
        print(f"\nContent Ideas for SajuMuse:")
        for i, idea in enumerate(result["content_ideas"][:5], 1):
            if isinstance(idea, dict):
                print(f"  {i}. {idea.get('title', idea.get('idea', str(idea)))}")
            else:
                print(f"  {i}. {idea}")

    if "judge_recommendations" in result:
        jr = result["judge_recommendations"]
        print(f"\nJudge Adjustments: {json.dumps(jr, ensure_ascii=False)[:200]}")

    print("=" * 60)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Manual Content Analyzer")
    parser.add_argument("--url", help="URL to fetch and analyze")
    parser.add_argument("--text", help="Text content to analyze directly")
    parser.add_argument("--file", help="Text file to analyze")
    args = parser.parse_args()

    api_key = get_anthropic_key()

    if args.url:
        content = fetch_url_content(args.url)
        if not content:
            print("[ERROR] Could not extract content from URL")
            sys.exit(1)
        source = args.url
    elif args.text:
        content = args.text
        source = "direct_input"
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
        source = args.file
    else:
        # Read from stdin
        print("Paste content below (Ctrl+D to finish):")
        content = sys.stdin.read()
        source = "stdin"

    if not content.strip():
        print("[ERROR] No content to analyze")
        sys.exit(1)

    result = call_claude(api_key, content, source)
    save_result(result, source, content[:200])
    print_summary(result)


if __name__ == "__main__":
    main()
