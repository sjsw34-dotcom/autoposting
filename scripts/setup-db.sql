-- ============================================
-- social-autoposter 테이블 (social_ prefix)
-- 기존 sajumuse Neon DB에 추가
-- ============================================

-- 포스팅 이력
CREATE TABLE IF NOT EXISTS social_posts (
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
  image_url TEXT,                       -- Vercel Blob 이미지 URL(s), comma separated
  platform_post_id VARCHAR(100),       -- 플랫폼 응답 ID
  status VARCHAR(20) DEFAULT 'success',-- 'success', 'failed', 'skipped'
  error_message TEXT,
  brand VARCHAR(20) DEFAULT 'sajumuse',-- 'sajumuse' | 'amormuse'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform, account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_posted_at ON social_posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_hash ON social_posts(content_hash);

-- 안전 메트릭 로그
CREATE TABLE IF NOT EXISTS social_safety_log (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  check_type VARCHAR(30) NOT NULL,     -- 'similarity', 'rate_limit', 'circuit_breaker', 'warmup'
  result VARCHAR(10) NOT NULL,         -- 'pass', 'fail', 'warn'
  details JSONB
);

-- 토큰 관리
CREATE TABLE IF NOT EXISTS social_tokens (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  token_type VARCHAR(20) NOT NULL,     -- 'access_token', 'refresh_token', 'api_key'
  token_value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id, token_type)
);

-- 계정 설정
CREATE TABLE IF NOT EXISTS social_config (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  brand VARCHAR(20) NOT NULL,          -- 'sajumuse', 'amormuse'
  niche VARCHAR(30) NOT NULL,          -- 'insight', 'fortune', 'kculture', 'love', 'wealth'
  link_url VARCHAR(200),               -- CTA 링크 대상
  is_active BOOLEAN DEFAULT TRUE,
  warmup_start_date DATE,
  warmup_complete BOOLEAN DEFAULT FALSE,
  post_times JSONB,                    -- 계정별 포스팅 시간대
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id)
);

-- 서킷 브레이커 상태
CREATE TABLE IF NOT EXISTS social_circuit_breaker (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'closed', -- 'closed'=정상, 'open'=중단, 'half-open'=테스트중
  consecutive_failures INT DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  resume_after TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id)
);

-- 월간 포스트 카운터 (X 한도 관리)
CREATE TABLE IF NOT EXISTS social_monthly_counter (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(10) NOT NULL,
  account_id VARCHAR(30) NOT NULL,
  year_month VARCHAR(7) NOT NULL,      -- '2026-04'
  post_count INT DEFAULT 0,
  limit_count INT DEFAULT 500,         -- X 무료: 500/월
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id, year_month)
);
