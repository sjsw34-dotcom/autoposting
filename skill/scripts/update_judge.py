#!/usr/bin/env python3
"""
Competitor Analyzer - Judge & Template Updater
recommendations.json의 분석 결과를 winning-patterns.md로 정리하고,
quality-judge.ts의 채점 기준 업데이트를 제안한다.

사용법:
    python update_judge.py --preview           # 변경 사항 미리보기만
    python update_judge.py --apply             # winning-patterns.md 생성

환경변수: 없음 (로컬 파일만 사용)
"""

import json
from pathlib import Path
from datetime import datetime

SKILL_DIR = Path(__file__).parent.parent
PROJECT_DIR = SKILL_DIR.parent
RECOMMENDATIONS_PATH = SKILL_DIR / "evolves" / "recommendations.json"
UPDATE_LOG_PATH = SKILL_DIR / "evolves" / "update_log.json"
PATTERNS_OUTPUT_PATH = SKILL_DIR / "evolves" / "winning-patterns.md"


def load_recommendations():
    if not RECOMMENDATIONS_PATH.exists():
        print("[ERROR] recommendations.json not found. Run analyze_patterns.py first.")
        return None
    with open(RECOMMENDATIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("analysis", data)


def preview_changes(recs: dict):
    """분석 결과를 미리보기로 출력"""
    if isinstance(recs, dict) and "analysis" in recs:
        recs = recs["analysis"]

    print("\n" + "=" * 60)
    print("COMPETITOR ANALYSIS RESULTS")
    print("=" * 60)

    # Top performing patterns
    patterns = recs.get("TOP_PERFORMING_PATTERNS", recs.get("top_performing_patterns", []))
    if patterns:
        print(f"\n--- Winning Patterns ({len(patterns)} found) ---")
        for i, p in enumerate(patterns[:10], 1):
            if isinstance(p, dict):
                print(f"  {i}. {p.get('pattern', p.get('description', str(p)[:80]))}")
            else:
                print(f"  {i}. {str(p)[:80]}")

    # Judge recommendations
    binary = recs.get("BINARY_CHECK_UPDATES", recs.get("binary_check_updates", {}))
    if binary:
        print("\n--- Quality Judge Adjustments ---")
        for check, detail in binary.items():
            if isinstance(detail, dict):
                print(f"  {check}: {detail.get('current', '?')} -> {detail.get('recommended', '?')}")
                print(f"    Reason: {detail.get('reason', '')}")

    llm = recs.get("LLM_AXIS_UPDATES", recs.get("llm_axis_updates", {}))
    if llm:
        print("\n--- Scoring Axis Changes ---")
        for item in llm.get("add", []):
            if isinstance(item, dict):
                print(f"  [ADD] {item.get('name', '?')} — {item.get('reason', '')}")
        for item in llm.get("adjust", []):
            if isinstance(item, dict):
                print(f"  [ADJUST] {item.get('name', '?')} -> {item.get('weight', '?')}")

    # Content calendar
    calendar = recs.get("CONTENT_CALENDAR", recs.get("content_calendar", []))
    if calendar:
        print(f"\n--- Content Ideas ({len(calendar)}) ---")
        for i, item in enumerate(calendar[:5], 1):
            if isinstance(item, dict):
                print(f"  {i}. [{item.get('platform', '?')}] {item.get('title', item.get('idea', str(item)[:60]))}")
            else:
                print(f"  {i}. {str(item)[:60]}")

    print("\n" + "=" * 60)


def generate_winning_patterns(recs: dict) -> str:
    """분석 결과를 winning-patterns.md로 변환 (프롬프트 템플릿 참조용)"""
    if isinstance(recs, dict) and "analysis" in recs:
        recs = recs["analysis"]

    lines = [
        f"# Winning Patterns from Competitor Analysis",
        f"_Auto-generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}_",
        f"_Source: {RECOMMENDATIONS_PATH.name}_",
        "",
        "Use these patterns when writing prompts for content templates.",
        "",
    ]

    # Hook patterns
    patterns = recs.get("TOP_PERFORMING_PATTERNS", recs.get("top_performing_patterns", []))
    if patterns:
        lines.append("## Top Performing Patterns")
        lines.append("")
        for i, p in enumerate(patterns, 1):
            if isinstance(p, dict):
                desc = p.get("pattern", p.get("description", str(p)))
                example = p.get("example", "")
                lines.append(f"### {i}. {desc}")
                if example:
                    lines.append(f"**Example:** {example}")
                lines.append("")
            else:
                lines.append(f"### {i}. {p}")
                lines.append("")

    # Judge axis recommendations
    binary = recs.get("BINARY_CHECK_UPDATES", recs.get("binary_check_updates", {}))
    llm = recs.get("LLM_AXIS_UPDATES", recs.get("llm_axis_updates", {}))
    if binary or llm:
        lines.append("## Quality Judge Tuning Suggestions")
        lines.append("")
        lines.append("Review these and manually update `lib/content/quality-judge.ts` if needed:")
        lines.append("")
        if binary:
            for check, detail in binary.items():
                if isinstance(detail, dict):
                    lines.append(f"- **{check}**: {detail.get('current', '?')} → {detail.get('recommended', '?')} ({detail.get('reason', '')})")
        if llm:
            for item in llm.get("add", []):
                if isinstance(item, dict):
                    lines.append(f"- **Add axis `{item.get('name', '?')}`**: {item.get('reason', '')}")
            for item in llm.get("adjust", []):
                if isinstance(item, dict):
                    lines.append(f"- **Adjust `{item.get('name', '?')}`** weight → {item.get('weight', '?')}")
        lines.append("")

    # Content ideas
    calendar = recs.get("CONTENT_CALENDAR", recs.get("content_calendar", []))
    if calendar:
        lines.append("## Content Ideas")
        lines.append("")
        for i, item in enumerate(calendar, 1):
            if isinstance(item, dict):
                platform = item.get("platform", "?")
                title = item.get("title", item.get("idea", str(item)))
                lines.append(f"{i}. **[{platform}]** {title}")
            else:
                lines.append(f"{i}. {item}")
        lines.append("")

    return "\n".join(lines)


def log_update(action: str):
    """변경 이력 기록"""
    if UPDATE_LOG_PATH.exists():
        with open(UPDATE_LOG_PATH, "r", encoding="utf-8") as f:
            log = json.load(f)
    else:
        log = {"updates": []}

    log["updates"].append({
        "date": datetime.now().isoformat(),
        "action": action,
    })

    UPDATE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(UPDATE_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)

    print(f"  [LOGGED] {UPDATE_LOG_PATH}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Judge & Template Updater")
    parser.add_argument("--preview", action="store_true", help="Preview only")
    parser.add_argument("--apply", action="store_true", help="Generate winning-patterns.md")
    args = parser.parse_args()

    if not args.preview and not args.apply:
        args.preview = True

    recs = load_recommendations()
    if not recs:
        return

    preview_changes(recs)

    if args.apply:
        md_content = generate_winning_patterns(recs)
        PATTERNS_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(PATTERNS_OUTPUT_PATH, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"\n  [SAVED] {PATTERNS_OUTPUT_PATH}")
        print("  Next: Review winning-patterns.md and update templates in lib/content/templates/")
        log_update("generated winning-patterns.md")
    else:
        print("\nTo generate patterns file: python update_judge.py --apply")


if __name__ == "__main__":
    main()
