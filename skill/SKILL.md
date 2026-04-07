---
name: competitor-analyzer
description: >
  서양 astrology 경쟁사 콘텐츠를 자동 수집/분석하여 SajuMuse 콘텐츠 품질을 개선하는 스킬.
  Apify API로 X/웹사이트 크롤링, Claude API로 패턴 분석, quality-judge 기준 피드백.
  자동 모드(API 크롤링)와 수동 모드(마스터가 URL/텍스트 입력) 모두 지원.
---

# Competitor Analyzer

서양 astrology 크리에이터들의 콘텐츠 패턴을 분석하여
SajuMuse의 포스트 품질을 데이터 기반으로 개선하는 엔진.

---

## 분석 대상 (Competitor Registry)

`references/competitors.json`에 정의.

### X (Twitter) Accounts
| Account | Why Benchmark |
|---------|---------------|
| @coaboratory (Co-Star) | 위트있는 짧은 포맷, Z세대 톤 |
| @ThePatternApp | 감성적 톤, 개인화 메시지 |
| @astikiapak | 교육적 astrology 스레드 |
| @NotAllGeminis | 밈/유머 기반 바이럴 포맷 |

### Websites
| Site | Why Benchmark |
|------|---------------|
| cafeastrology.com | SEO 구조, 키워드 커버리지 |
| astrostyle.com | 블로그 포맷, CTA 전략 |
| costarastrology.com | 브랜딩, UX 카피 |

---

## 동작 모드

### Mode A: 자동 수집 (Auto Crawl)

Apify API + Claude API로 완전 자동.

```bash
# 전체 실행
python skill/scripts/crawl_x.py          # X 포스트 수집
python skill/scripts/crawl_web.py        # 웹사이트 크롤링
python skill/scripts/analyze_patterns.py # 패턴 분석
python skill/scripts/update_judge.py --apply  # winning-patterns.md 생성

# 특정 계정/사이트만
python skill/scripts/crawl_x.py --handle coaboratory
python skill/scripts/crawl_web.py --site cafeastrology.com

# 키워드 트렌드 검색
python skill/scripts/crawl_x.py --keyword "korean astrology"

# 설정 확인 (API 호출 없이)
python skill/scripts/crawl_x.py --dry-run
```

### Mode B: 수동 입력 (Manual Feed)

Medium, 개별 포스트 등 API 없는 콘텐츠 분석용.

```bash
# URL 분석
python skill/scripts/analyze_manual.py --url "https://medium.com/some-article"

# 텍스트 직접 입력
python skill/scripts/analyze_manual.py --text "포스트 내용"

# 파일 분석
python skill/scripts/analyze_manual.py --file content.txt
```

---

## 프로젝트 연결

### 분석 결과 → 품질 개선 흐름

```
[크롤링]                    [분석]                     [적용]
crawl_x.py ─┐              analyze_patterns.py ──→ recommendations.json
crawl_web.py ┘                                         │
                                                       ▼
analyze_manual.py ──→ manual_analyses/          update_judge.py --apply
                                                       │
                                                       ▼
                                              winning-patterns.md
                                                       │
                                    ┌──────────────────┼─────────────────┐
                                    ▼                  ▼                 ▼
                          lib/content/        lib/content/        lib/content/
                          templates/*.ts      quality-judge.ts    generator.ts
                          (프롬프트 개선)      (채점 기준 조정)    (anti-detection)
```

### quality-judge.ts (자동 통합)

포스트 생성 → 품질 채점 → 기준 미달 시 재생성.
5축 채점: hook_power, emotional_pull, saju_authenticity, scroll_stop, natural_voice.
50점 만점, 30점 이상 통과.

---

## 디렉토리 구조

```
skill/
├── SKILL.md                     # 이 파일
├── references/
│   ├── competitors.json         # 분석 대상 목록 + API 설정
│   └── analysis_prompts.md      # Claude API 분석 프롬프트
├── scripts/
│   ├── crawl_x.py               # Apify X 크롤러
│   ├── crawl_web.py             # Apify 웹 크롤러
│   ├── analyze_patterns.py      # Claude 패턴 분석
│   ├── analyze_manual.py        # 수동 입력 분석
│   └── update_judge.py          # winning-patterns.md 생성
└── evolves/                     # 분석 결과 (자동 생성)
    ├── raw_data/x/              # X 크롤링 원본
    ├── raw_data/web/            # 웹 크롤링 원본
    ├── manual_analyses/         # 수동 분석 결과
    ├── analysis_report.json     # 종합 분석 리포트
    ├── recommendations.json     # judge 업데이트 권장사항
    ├── winning-patterns.md      # 템플릿 참조용 패턴 요약
    └── update_log.json          # 변경 이력
```

---

## 환경변수

| 변수 | 용도 | 필수 |
|------|------|------|
| APIFY_API_TOKEN | Apify 크롤링 | Mode A만 |
| ANTHROPIC_API_KEY | Claude 분석 | 분석 시 |

## 비용

- Apify: 월 $5 크레딧 (무료 티어 충분)
- Claude API: 분석 1회당 ~$0.01-0.05 (Sonnet)
- quality-judge.ts: 포스트당 ~$0.003 (짧은 프롬프트)
