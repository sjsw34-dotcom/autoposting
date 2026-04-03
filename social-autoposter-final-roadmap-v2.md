# SajuMuse 멀티 플랫폼 자동포스팅 — 최종 로드맵 v2.0

> **프로젝트:** social-autoposter (별도 Vercel 프로젝트)
> **DB:** 기존 sajumuse Neon DB 공유 (social_ prefix 테이블)
> **목표:** 7개 채널 자동포스팅, Vercel Cron 통합 운영
> **원칙:** 계정 안전 최우선 + 플랫폼별 정책 완전 준수
> **예상 추가비용:** ~$10~20/월 (Claude API만)

---

## 1. 최종 채널 구조 (확정)

| # | 플랫폼 | 계정 | 브랜드 | 니치/콘텐츠 | 링크 | 빈도 |
|---|--------|------|--------|------------|------|------|
| 1 | Threads | sajumuse | SajuMuse | 사주 운세 + K-Culture | sajumuse.com | 3회/일 |
| 2 | Medium | ksajukim | SajuMuse | 장문 블로그 (SEO) | sajumuse.com | 2~3회/주 |
| 3 | X #1 | (마스터 지정) | SajuMuse | 사주 종합 인사이트 | sajumuse.com | 3회/일 |
| 4 | X #2 | (마스터 지정) | SajuMuse | 일간 오행 운세 | sajumuse.com | 3회/일 |
| 5 | X #3 | (마스터 지정) | SajuMuse | 사주 + K-Culture | sajumuse.com | 3회/일 |
| 6 | X #4 | (마스터 지정) | AmorMuse | 연애운/궁합 | amormuse.com | 3회/일 |
| 7 | X #5 | (마스터 지정) | SajuMuse | 재물운/커리어 | sajumuse.com | 3회/일 |

**일일 총 포스트:** Threads 3 + X 15 + Medium 0~1 = **약 18~19개/일**

---

## 2. 프로젝트 구조 (확정)

```
social-autoposter/              ← 새 Vercel 프로젝트 (GitHub repo)
├── package.json
├── vercel.json                 ← Cron 스케줄 정의
├── .env.local                  ← API 키/토큰 (Vercel 환경변수)
│
├── api/                        ← Vercel Serverless Functions
│   ├── threads/
│   │   ├── post.ts             ← Threads 포스팅 엔드포인트
│   │   └── refresh-token.ts    ← 토큰 자동 갱신
│   ├── x/
│   │   └── post.ts             ← X 5계정 포스팅 (계정 로테이션)
│   ├── medium/
│   │   └── post.ts             ← Medium 블로그 발행
│   └── health/
│       └── check.ts            ← 시스템 상태 체크
│
├── lib/
│   ├── safety/
│   │   ├── timing-engine.ts    ← 타이밍 랜덤화 + 지터
│   │   ├── content-guard.ts    ← 콘텐츠 안전 필터
│   │   ├── similarity-check.ts ← 유사도 체크 (계정간 + 이력)
│   │   ├── circuit-breaker.ts  ← 에러 감지 + 자동 중단
│   │   ├── rate-limiter.ts     ← 플랫폼별 한도 관리
│   │   └── warmup-manager.ts   ← 웜업 기간 관리
│   │
│   ├── content/
│   │   ├── generator.ts        ← Claude API 콘텐츠 생성
│   │   ├── threads-format.ts   ← Threads 포맷 (100~500자)
│   │   ├── x-format.ts         ← X 포맷 (280자 이내)
│   │   ├── medium-format.ts    ← Medium 포맷 (1000~2000단어)
│   │   └── templates/          ← 채널별 프롬프트 템플릿
│   │       ├── saju-insight.ts
│   │       ├── daily-fortune.ts
│   │       ├── k-culture-mix.ts
│   │       ├── love-destiny.ts
│   │       └── wealth-career.ts
│   │
│   ├── platforms/
│   │   ├── threads-client.ts   ← Threads API 래퍼
│   │   ├── x-client.ts         ← X API 래퍼 (멀티 계정)
│   │   └── medium-client.ts    ← Medium API 래퍼
│   │
│   ├── db/
│   │   ├── client.ts           ← Neon DB 연결
│   │   ├── posts.ts            ← 포스팅 이력 CRUD
│   │   ├── tokens.ts           ← 토큰 관리
│   │   └── safety-log.ts       ← 안전 로그
│   │
│   └── notify/
│       └── telegram.ts         ← 텔레그램 알림
│
└── scripts/
    ├── setup-db.sql            ← 테이블 생성 스크립트
    └── test-post.ts            ← 수동 테스트 스크립트
```

**기존 사이트와의 관계:**
```
sajumuse.com       → 기존 그대로 (건드리지 않음)
amormuse.com       → 기존 그대로 (건드리지 않음)
social-autoposter  → 완전 독립 프로젝트 (DB만 공유)
```

---

## 3. DB 스키마 (기존 Neon DB에 추가)

```sql
-- ============================================
-- social-autoposter 테이블 (social_ prefix)
-- ============================================

-- 포스팅 이력
CREATE TABLE social_posts (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,       -- 'threads', 'x', 'medium'
  account_id VARCHAR(30) NOT NULL,     -- 계정 식별자 (username)
  posted_at TIMESTAMPTZ NOT NULL,
  slot VARCHAR(10),                    -- 'morning', 'lunch', 'evening'
  content_type VARCHAR(30) NOT NULL,   -- 'fortune', 'insight', 'kculture', 'love', 'wealth'
  content TEXT NOT NULL,
  content_hash VARCHAR(64),            -- SHA-256 (유사도 체크용)
  has_link BOOLEAN DEFAULT FALSE,
  has_image BOOLEAN DEFAULT FALSE,
  platform_post_id VARCHAR(100),       -- 플랫폼 응답 ID
  status VARCHAR(20) DEFAULT 'success',-- 'success', 'failed', 'skipped'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_social_posts_platform ON social_posts(platform, account_id);
CREATE INDEX idx_social_posts_posted_at ON social_posts(posted_at DESC);
CREATE INDEX idx_social_posts_hash ON social_posts(content_hash);

-- 안전 메트릭 로그
CREATE TABLE social_safety_log (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  check_type VARCHAR(30) NOT NULL,     -- 'similarity', 'rate_limit', 'circuit_breaker', 'warmup'
  result VARCHAR(10) NOT NULL,         -- 'pass', 'fail', 'warn'
  details JSONB
);

-- 토큰 관리
CREATE TABLE social_tokens (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  token_type VARCHAR(20) NOT NULL,     -- 'access_token', 'refresh_token', 'api_key'
  token_value TEXT NOT NULL,           -- 암호화 권장
  expires_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id, token_type)
);

-- 계정 설정
CREATE TABLE social_config (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  brand VARCHAR(20) NOT NULL,          -- 'sajumuse', 'amormuse'
  niche VARCHAR(30) NOT NULL,          -- 'insight', 'fortune', 'kculture', 'love', 'wealth'
  link_url VARCHAR(200),               -- CTA 링크 대상
  is_active BOOLEAN DEFAULT TRUE,
  warmup_start_date DATE,              -- 웜업 시작일
  warmup_complete BOOLEAN DEFAULT FALSE,
  post_times JSONB,                    -- 계정별 포스팅 시간대
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id)
);

-- 서킷 브레이커 상태
CREATE TABLE social_circuit_breaker (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'closed', -- 'closed'=정상, 'open'=중단, 'half-open'=테스트중
  consecutive_failures INT DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  resume_after TIMESTAMPTZ,            -- 이 시간 이후 재시도
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id)
);

-- 월간 포스트 카운터 (X 한도 관리)
CREATE TABLE social_monthly_counter (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  year_month VARCHAR(7) NOT NULL,      -- '2026-04'
  post_count INT DEFAULT 0,
  limit_count INT DEFAULT 500,         -- X 무료: 500/월
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id, year_month)
);
```

---

## 4. Vercel Cron 스케줄 (확정)

```json
{
  "crons": [
    {
      "path": "/api/threads/post",
      "schedule": "0 23 * * *"
    },
    {
      "path": "/api/threads/post",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/threads/post",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/x/post",
      "schedule": "10 23 * * *"
    },
    {
      "path": "/api/x/post",
      "schedule": "10 1 * * *"
    },
    {
      "path": "/api/x/post",
      "schedule": "10 5 * * *"
    },
    {
      "path": "/api/medium/post",
      "schedule": "0 2 * * 1,3,5"
    },
    {
      "path": "/api/threads/refresh-token",
      "schedule": "0 0 1,15 * *"
    },
    {
      "path": "/api/health/check",
      "schedule": "0 12 * * *"
    }
  ]
}
```

**시간 설명 (UTC → KST):**
| Cron (UTC) | KST | 대상 |
|------------|-----|------|
| 23:00 | 08:00 아침 | Threads |
| 03:00 | 12:00 점심 | Threads |
| 10:00 | 19:00 저녁 | Threads |
| 23:10 | 08:10 | X 5계정 (내부 시간 분산) |
| 01:10 | 10:10 | X 5계정 (내부 시간 분산) |
| 05:10 | 14:10 | X 5계정 (내부 시간 분산) |
| 02:00 월수금 | 11:00 | Medium 블로그 |
| 00:00 1,15일 | 09:00 | Threads 토큰 갱신 |
| 12:00 매일 | 21:00 | 헬스체크 + 일일리포트 |

> X는 cron 1회 호출 시 내부에서 5계정을 **2시간 간격**으로 분산 처리
> 각 포스팅에 ±90분 랜덤 지터 추가

---

## 5. 플랫폼별 안전 규칙 (확정)

### 5-1. 공통 안전 로직 (6겹 레이어)
```
Layer 1: 타이밍 랜덤화 (±90분 지터, 최소 3시간 간격)
Layer 2: 콘텐츠 유니크니스 (유사도 체크, 타입 로테이션)
Layer 3: 링크/CTA 안전 관리 (20% 이하, 연속 금지)
Layer 4: 활동량 웜업 (2주 점진 증가)
Layer 5: 에러 감지 + 서킷 브레이커
Layer 6: 콘텐츠 안전 필터 (길이/해시태그/금지어)
```

### 5-2. Threads 전용
```
• 계정: 1개만 (절대 다계정 금지)
• 해시태그: 1개 이하
• 링크: 전체의 20% 이하
• 콘텐츠: 오리지널만 (복붙 감지 엄격)
• 토큰: 60일 만료 → 30일마다 자동 갱신
```

### 5-3. X 전용 (5계정)
```
• 계정간 상호작용 절대 금지 (좋아요/리트윗/답글)
• 계정간 동일/유사 콘텐츠 금지 (cross-account 유사도 체크)
• 같은 외부 링크 2개 이상 계정에서 동시 사용 금지
• 포스팅 시간 계정별 최소 2시간 간격
• 월 500개 한도 모니터링 (계정별, 400개 경고)
```

**X 계정별 포스팅 시간 분산:**
```
X #1 (사주 종합):    08:00  13:00  19:00 KST (±지터)
X #2 (일간 운세):    09:00  14:00  20:00 KST (±지터)
X #3 (K-Culture):   10:00  15:00  21:00 KST (±지터)
X #4 (연애운):      11:00  16:00  22:00 KST (±지터)
X #5 (재물운):      12:00  17:00  23:00 KST (±지터)
```

### 5-4. Medium 전용
```
• 계정: 1개
• 주 2~3회 (과다 포스팅 불필요)
• canonical URL = sajumuse.com (SEO 중복 방지)
• 태그 최대 5개
• CTA 규칙: medium-saju-blog 스킬 연동
  (35% 지점 / 65% 지점 / 마무리)
```

---

## 6. 콘텐츠 생성 전략

### 채널별 Claude API 프롬프트 차별화

| 채널 | 길이 | 톤 | 특징 |
|------|------|-----|------|
| Threads | 100~500자 | 캐주얼, 친근 | 이모지 적당, 질문형 |
| X (전체) | 280자 이내 | 펀치라인, 임팩트 | 짧고 강렬, 리트윗 유도 |
| X #4 AmorMuse | 280자 이내 | 로맨틱, 위트 | 연애 고민 공감형 |
| Medium | 1000~2000단어 | 전문적, 교육적 | SEO 키워드, 3-Layer 용어 |

### 콘텐츠 타입 로테이션 (일간)

**Threads (3회/일):**
```
아침: 오늘의 오행 에너지 포치네
점심: K-Culture + 사주 믹스
저녁: 사주 팁/인사이트
```

**X 각 계정 (3회/일, 각각 다른 니치):**
```
#1 사주 종합:  분석 인사이트 / 유명인 사주 분석 / 사주 Q&A
#2 일간 운세:  오늘의 운세 / 오행별 에너지 / 주간 하이라이트
#3 K-Culture:  한국 문화 + 사주 / 계절 절기 / K-드라마 연결
#4 연애운:     궁합 팁 / 연애 사주 해석 / 관계 조언
#5 재물운:     재물운 분석 / 커리어 사주 / 투자 타이밍
```

**Medium (주 2~3회):**
```
월: 심층 사주 분석 (시리즈형)
수: K-Culture + 사주 교차 콘텐츠
금: 계절/시기별 운세 가이드
```

---

## 7. 모니터링 & 알림 (텔레그램)

### 일일 리포트 (매일 21:00 KST)
```
📊 SajuMuse Social Daily Report
━━━━━━━━━━━━━━━━━━━━━━
📌 Threads: 3/3 ✅
📌 X #1:    3/3 ✅
📌 X #2:    3/3 ✅
📌 X #3:    2/3 ⚠️ (1 skipped: similarity)
📌 X #4:    3/3 ✅
📌 X #5:    3/3 ✅
📌 Medium:  0/0 (비게시일)
━━━━━━━━━━━━━━━━━━━━━━
✅ 성공: 17  ⚠️ 스킵: 1  ❌ 실패: 0
🔒 서킷브레이커: 전체 정상
```

### 즉시 알림 트리거
| 이벤트 | 레벨 | 액션 |
|--------|------|------|
| 1회 실패 | ⚠️ | 알림 + 로그 |
| 3회 연속 실패 | 🔴 | 해당 계정 24시간 휴식 |
| HTTP 403 | 🚨 | 해당 플랫폼 전체 중단 + 긴급 알림 |
| X 월 400개 도달 | ⚠️ | 한도 임박 경고 |
| Threads 토큰 D-7 | ⚠️ | 갱신 필요 알림 |
| 토큰 갱신 성공 | ℹ️ | 확인 알림 |

---

## 8. 셋업 일정 (확정)

### Phase 1: Threads (Week 1~2)
```
마스터 할 일:
  □ Meta Developer 계정 등록
  □ 2FA 활성화
  □ Threads API 앱 생성 + 테스터 등록
  □ Long-lived Token 발급

Claude Code 할 일:
  □ social-autoposter GitHub repo 생성
  □ Vercel 프로젝트 연결
  □ Neon DB 테이블 생성
  □ Threads 포스팅 코드 + 안전 로직
  □ 텔레그램 알림 연동
  □ 웜업 모드 시작 (1회/일)
```

### Phase 2: X — 5개 계정 (Week 3~4)
```
마스터 할 일:
  □ X 5개 계정 username 확정 + 생성
  □ X Developer 계정 등록
  □ 5개 계정 각각 OAuth 토큰 발급

Claude Code 할 일:
  □ X 멀티계정 포스팅 코드
  □ 계정간 안전 로직 (cross-account)
  □ 월간 한도 모니터링
  □ 웜업 모드 시작 (계정별 1회/일)
```

### Phase 3: Medium (Week 5)
```
마스터 할 일:
  □ Medium Integration Token 발급

Claude Code 할 일:
  □ Medium 포스팅 코드
  □ medium-saju-blog 스킬 연동
  □ canonical URL 설정
  □ 주 2~3회 스케줄 설정
```

### Phase 4: 통합 안정화 (Week 6)
```
□ 전체 채널 통합 테스트
□ 웜업 완료 확인 (전 계정)
□ 주간 리포트 기능 추가
□ 비상 시나리오 테스트 (서킷 브레이커)
□ 정상 운영 전환 🚀
```

---

## 9. 예상 비용 (월간, 확정)

| 항목 | 비용 |
|------|------|
| Threads API | $0 |
| X API Free × 5 | $0 |
| Medium API | $0 |
| Claude API (콘텐츠 생성, ~18개/일) | ~$10~20 |
| Vercel (기존 Pro plan) | $0 추가 |
| Neon DB (기존 Free plan) | $0 추가 |
| 텔레그램 Bot | $0 |
| **월 총 추가비용** | **~$10~20** |

---

## 10. 환경변수 목록

```env
# === Threads ===
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_USER_ID=
THREADS_ACCESS_TOKEN=

# === X (5개 계정) ===
X_API_KEY=
X_API_SECRET=
X_ACCOUNT_1_TOKEN=
X_ACCOUNT_1_SECRET=
X_ACCOUNT_1_USERNAME=
X_ACCOUNT_2_TOKEN=
X_ACCOUNT_2_SECRET=
X_ACCOUNT_2_USERNAME=
X_ACCOUNT_3_TOKEN=
X_ACCOUNT_3_SECRET=
X_ACCOUNT_3_USERNAME=
X_ACCOUNT_4_TOKEN=
X_ACCOUNT_4_SECRET=
X_ACCOUNT_4_USERNAME=
X_ACCOUNT_5_TOKEN=
X_ACCOUNT_5_SECRET=
X_ACCOUNT_5_USERNAME=

# === Medium ===
MEDIUM_INTEGRATION_TOKEN=
MEDIUM_AUTHOR_ID=

# === Claude API ===
ANTHROPIC_API_KEY=

# === Neon DB ===
DATABASE_URL=

# === Telegram ===
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# === Security ===
CRON_SECRET=
```

---

## 마스터 즉시 액션 아이템

### 오늘 할 수 있는 것
1. **X 5개 계정 username 확정** (니치별)
2. **Meta Developer 등록 시작** → developers.facebook.com
3. **X Developer 등록 시작** → developer.x.com

### 완료 후 알려주실 것
- "Meta Developer 등록 완료" → Phase 1 코드 구축 시작
- "X 계정명 확정" → Phase 2 설계 반영
- "X Developer 등록 완료" → Phase 2 코드 구축 시작

> 🚀 Phase 1 준비되면 알려주세요. 바로 코드 구축 들어갑니다!
