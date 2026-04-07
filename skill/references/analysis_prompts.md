# Analysis Prompts

Claude API 호출 시 사용하는 분석 프롬프트 모음.
`analyze_patterns.py`와 `analyze_manual.py`가 참조한다.

---

## X Post Batch Analysis

```
You are analyzing social media posts from top Western astrology accounts to extract patterns for a Korean astrology (Saju/Four Pillars) brand called SajuMuse.

Analyze the following {count} posts from @{handle} and extract:

1. HOOK PATTERNS: Categorize each post's opening hook type:
   - Question ("What if your sign...")
   - Declaration ("Scorpios don't forgive.")
   - Number/List ("3 signs that...")
   - Contrast ("Everyone thinks X but actually Y")
   - Direct address ("Hey Aries,")
   - Cultural reference ("That feeling when...")

2. TONE PROFILE: Rate the overall tone (1-10) on these axes:
   - Witty/Humorous
   - Mystical/Spiritual
   - Educational/Informative
   - Emotional/Vulnerable
   - Provocative/Bold

3. STRUCTURAL PATTERNS:
   - Average character count
   - Emoji usage pattern (position, count, type)
   - Hashtag strategy
   - CTA style (link, profile, none)
   - Line break usage

4. ENGAGEMENT CORRELATION:
   - Which hook types got highest engagement?
   - Which tone got highest engagement?
   - Optimal length for engagement?

5. SAJU ADAPTATION:
   - How can each high-performing pattern be adapted for Korean astrology?
   - What Saju-specific angles would differentiate from these posts?
   - Specific post ideas using these patterns with Saju content

Return ONLY a JSON object. No markdown, no preamble.
```

---

## Blog/Website SEO Analysis

```
You are analyzing the SEO and content structure of a top Western astrology website to extract patterns for sajumuse.com (Korean Four Pillars of Destiny).

Analyze the following {count} pages from {site_name} and extract:

1. SEO STRUCTURE:
   - Title tag patterns (length, keyword placement, emotional triggers)
   - Meta description patterns
   - H1/H2/H3 hierarchy and naming conventions
   - URL slug patterns
   - Internal linking strategy (how many, where placed)
   - Schema markup types used

2. CONTENT STRUCTURE:
   - Introduction style (question, story, stat, direct)
   - Section flow pattern (problem > explain > apply, etc.)
   - Paragraph length average
   - Use of bold/italic/callouts
   - Image/visual placement strategy
   - CTA placement and style

3. TOPIC COVERAGE:
   - Main content categories
   - Content depth per topic (surface vs comprehensive)
   - Seasonal/timely content ratio
   - Evergreen vs trending content split

4. KEYWORD GAPS FOR SAJU:
   - Topics they cover that Saju can offer a unique angle on
   - Topics they DON'T cover that Saju naturally addresses
   - Long-tail keywords with low competition for Korean astrology

5. ACTIONABLE RECOMMENDATIONS:
   - Top 5 structural patterns to adopt for sajumuse.com blog
   - Top 5 content ideas based on gaps identified
   - SEO quick wins (keywords to target immediately)

Return ONLY a JSON object. No markdown, no preamble.
```

---

## Single Content Analysis (Manual Mode)

```
You are analyzing a single piece of astrology content to extract actionable patterns for SajuMuse, a Korean Four Pillars of Destiny brand.

Analyze this content and provide:

1. WHAT WORKS:
   - Hook effectiveness (1-10 with reason)
   - Tone and voice characteristics
   - Structural elements that drive engagement
   - CTA effectiveness

2. WHAT TO ADAPT:
   - How to recreate this pattern with Saju content
   - Specific Saju topics that fit this format
   - Korean cultural angles to differentiate

3. JUDGE RECOMMENDATIONS:
   - Should any binary check thresholds be adjusted?
   - Should any LLM judge axis weights be changed?
   - New patterns to add to scoring criteria?

4. CONTENT IDEAS:
   - 3 specific post ideas inspired by this content, adapted for Saju

Return ONLY a JSON object. No markdown, no preamble.
```

---

## Trend Keyword Analysis

```
You are analyzing recent social media posts about Korean astrology / Saju / Four Pillars to identify trending angles and content opportunities for SajuMuse.

Analyze these {count} posts mentioning Korean astrology keywords and extract:

1. TRENDING ANGLES:
   - What aspects of Korean astrology are people curious about?
   - Common questions being asked
   - Misconceptions being spread (opportunity for educational content)

2. AUDIENCE SIGNALS:
   - Who is talking about this? (demographics, interests)
   - What related topics do they also discuss?
   - What language/tone resonates?

3. CONTENT OPPORTUNITIES:
   - Unanswered questions SajuMuse can answer
   - Trending formats to use (thread, carousel, short post)
   - Timely hooks to leverage

4. COMPETITIVE POSITIONING:
   - How is SajuMuse mentioned (if at all)?
   - Who else is creating Korean astrology content?
   - Gaps in current Korean astrology content online

Return ONLY a JSON object. No markdown, no preamble.
```
