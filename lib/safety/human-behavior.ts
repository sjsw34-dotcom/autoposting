/**
 * ============================================================
 * HUMAN BEHAVIOR SIMULATION ENGINE
 * ============================================================
 *
 * 봇 탐지 알고리즘이 잡아내는 것들:
 * 1. 기계적 정확성 — 매일 같은 시간, 같은 빈도, 같은 패턴
 * 2. 활동 일관성 — 사람은 아프거나, 바쁘거나, 귀찮아서 안 올림
 * 3. 콘텐츠 균일성 — 항상 같은 길이, 같은 구조, 같은 ���
 * 4. 비인간적 시간대 — 새벽 3시에 완벽한 글을 올리는 건 사람이 아님
 * 5. 링크 패턴 — 매번 링크 포함, 항상 같은 도메인
 *
 * 이 엔진의 원칙: "완벽한 자동화가 아니라, 불완전한 인간"
 */

import { sql } from '@/lib/db/client';
import { logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

// ============================================================
// 1. 랜덤 스킵 — 사람은 매일 올리지 않는다
// ============================================================

/**
 * 오늘 포스팅을 "안 하는" 날인지 결정
 * 사람은 주말에 덜 활동하고, 가끔 쉬는 날이 있다
 */
export async function shouldSkipToday(
  platform: Platform,
  accountId: string
): Promise<{ skip: boolean; reason?: string }> {
  const dayOfWeek = new Date().getDay(); // 0=일, 6=토
  const dayOfMonth = new Date().getDate();

  // 시드: 날짜 + 계정명으로 결정적 랜덤 (같은 날 같은 결과)
  const seed = hashCode(`${new Date().toISOString().slice(0, 10)}-${platform}-${accountId}`);
  const roll = Math.abs(seed % 100);

  // 일요일: 40% 확률로 쉼 (사람은 일요일에 쉰다)
  if (dayOfWeek === 0 && roll < 40) {
    await logSafetyCheck(platform, accountId, 'warmup', 'pass', {
      action: 'human_skip_sunday', roll,
    });
    return { skip: true, reason: 'Sunday rest day (human pattern)' };
  }

  // 토요일: 25% 확률로 쉼
  if (dayOfWeek === 6 && roll < 25) {
    await logSafetyCheck(platform, accountId, 'warmup', 'pass', {
      action: 'human_skip_saturday', roll,
    });
    return { skip: true, reason: 'Saturday rest (human pattern)' };
  }

  // 평일: 8% 확률로 쉼 (몸이 안 좋거나, 바쁘거나)
  if (roll < 8) {
    await logSafetyCheck(platform, accountId, 'warmup', 'pass', {
      action: 'human_skip_random', roll,
    });
    return { skip: true, reason: 'Random off-day (human pattern)' };
  }

  // 매월 특정 날에 한 번은 연속 2일 쉼 (여행/휴가 시뮬레이션)
  const vacationDay = (hashCode(`vacation-${accountId}-${new Date().getMonth()}`) % 28) + 1;
  if (dayOfMonth === vacationDay || dayOfMonth === vacationDay + 1) {
    await logSafetyCheck(platform, accountId, 'warmup', 'pass', {
      action: 'human_skip_vacation', vacationDay,
    });
    return { skip: true, reason: 'Mini vacation (human pattern)' };
  }

  return { skip: false };
}

// ============================================================
// 2. 오늘의 "에너지" — 포스팅 횟수 변동
// ============================================================

/**
 * 오늘 이 계정이 올릴 최대 포스트 수
 * 사람은 어떤 날은 열정적이고, 어떤 날은 최소만 한다
 *
 * 기본 3회/일 대신: 1~3회를 자연스럽게 분포
 */
export function getTodayEnergy(platform: Platform, accountId: string): number {
  if (platform === 'medium') return 1; // Medium은 항상 1

  const seed = hashCode(`energy-${new Date().toISOString().slice(0, 10)}-${accountId}`);
  const roll = Math.abs(seed % 100);

  // 분포: 15% → 1회, 40% → 2회, 45% → 3회
  // = 평균 2.3회/일 (매일 정확히 3회가 아님)
  if (roll < 15) return 1;
  if (roll < 55) return 2;
  return 3;
}

// ============================================================
// 3. 슬롯별 스킵 — 모든 슬롯을 다 채우지 않는다
// ============================================================

/**
 * 이 슬롯에 포스팅할지 결정
 * 오늘의 에너지와 현재 슬롯 번호로 결정
 */
export function shouldPostThisSlot(
  platform: Platform,
  accountId: string,
  slotIndex: number, // 0=아침, 1=점심, 2=저녁
  todayEnergy: number
): boolean {
  if (platform === 'medium') return true;

  // 에너지가 3이면 모든 슬롯, 2면 2개, 1이면 1개
  if (todayEnergy >= 3) return true;

  // 어떤 슬롯을 스킵할지 결정 (날짜 기반 결정적)
  const seed = hashCode(`slot-${new Date().toISOString().slice(0, 10)}-${accountId}`);

  if (todayEnergy === 2) {
    // 3개 중 1개 스킵: 어떤 슬롯을 건너뛸지
    const skipSlot = Math.abs(seed % 3);
    return slotIndex !== skipSlot;
  }

  if (todayEnergy === 1) {
    // 3개 중 1개만: 어떤 슬롯에 올릴지
    const postSlot = Math.abs(seed % 3);
    return slotIndex === postSlot;
  }

  return true;
}

// ============================================================
// 4. 가우시안 타이밍 — 균등 랜덤이 아닌 인간적 분포
// ============================================================

/**
 * Box-Muller 가우시안 랜덤
 * 균등분포(Math.random)와 달리 중앙에 몰리는 자연스러운 분포
 */
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/**
 * 인간적 포스팅 딜레이 계산 (초)
 *
 * Vercel Serverless는 10초 제한이므로 sleep 불가.
 * 대신 0을 반환하고, 인간적 타이밍은 다음으로 달성:
 * 1. Cron 시간 자체가 매 슬롯 다른 분(minute)에 호출
 * 2. shouldSkipToday / shouldPostThisSlot 으로 불규칙성 확보
 * 3. 콘텐츠 생성 자체에 1~3초 소요 (자연스러운 지연)
 */
export function getHumanDelay(): number {
  return 0; // Vercel Serverless 환경 — sleep 불가
}

// ============================================================
// 5. 콘텐츠 길이 변동 — 항상 같은 길이가 아님
// ============================================================

/**
 * 오늘의 "글쓰기 무드"에 따른 목표 길이 조정
 * 어떤 날은 길게, 어떤 날은 짧게
 */
export function getContentLengthMood(platform: Platform): {
  modifier: string; // 프롬프트에 추가할 지시
  targetMultiplier: number; // 1.0 = 기본
} {
  const roll = Math.random();

  if (platform === 'x') {
    // X: 80~280자 사이에서 변동
    if (roll < 0.3) return { modifier: 'Keep it super short, under 140 characters. Just one punchy line.', targetMultiplier: 0.5 };
    if (roll < 0.7) return { modifier: 'Normal tweet length, around 200 characters.', targetMultiplier: 1.0 };
    return { modifier: 'Use the full 280 characters if needed. Pack in the insight.', targetMultiplier: 1.3 };
  }

  if (platform === 'threads') {
    // Threads: 50~500자 사이에서 변동
    if (roll < 0.25) return { modifier: 'Keep it very short, 2-3 sentences max. Quick thought.', targetMultiplier: 0.5 };
    if (roll < 0.6) return { modifier: 'Medium length, a nice meaty paragraph.', targetMultiplier: 1.0 };
    return { modifier: 'Go a bit longer today, tell a mini story or give a detailed explanation.', targetMultiplier: 1.5 };
  }

  // Medium: 800~2500 단어
  if (roll < 0.3) return { modifier: 'Shorter article today, around 800-1000 words. Focused and punchy.', targetMultiplier: 0.7 };
  if (roll < 0.7) return { modifier: 'Standard length, 1200-1500 words.', targetMultiplier: 1.0 };
  return { modifier: 'Deep dive today, 1800-2200 words. Really explore the topic.', targetMultiplier: 1.3 };
}

// ============================================================
// 6. 글쓰기 스타일 변동 — 매번 다른 "기분"
// ============================================================

const WRITING_MOODS = [
  { mood: 'excited', instruction: 'You\'re feeling energized today. Your writing is upbeat, uses exclamation points sparingly but genuinely, and has infectious enthusiasm.' },
  { mood: 'thoughtful', instruction: 'You\'re in a reflective mood. Your writing is calmer, more contemplative. You ask questions and ponder rather than declare.' },
  { mood: 'playful', instruction: 'You\'re in a fun mood. Your writing has humor, wordplay, maybe a pun. Light-hearted but still informative.' },
  { mood: 'direct', instruction: 'You\'re feeling no-nonsense today. Short sentences. Clear points. No fluff. Get to the insight fast.' },
  { mood: 'storytelling', instruction: 'You feel like telling a story today. Start with an anecdote or scenario, then connect it to the Saju insight.' },
  { mood: 'curious', instruction: 'You\'re in a questioning mood. Frame things as discoveries and "hmm, isn\'t it interesting that..." moments.' },
  { mood: 'empathetic', instruction: 'You\'re feeling connected to your audience today. Acknowledge struggles, validate feelings, then offer the Saju perspective as comfort.' },
  { mood: 'witty', instruction: 'Sharp and clever today. Dry humor, unexpected angles, the kind of post people screenshot to share.' },
] as const;

/**
 * 오늘의 글쓰기 무드 선택
 * 같은 날 같은 계정은 일관된 무드 유지 (하루 안에서는 일관)
 */
export function getWritingMood(accountId: string): typeof WRITING_MOODS[number] {
  const seed = hashCode(`mood-${new Date().toISOString().slice(0, 10)}-${accountId}`);
  return WRITING_MOODS[Math.abs(seed) % WRITING_MOODS.length];
}

// ============================================================
// 7. 해시태그 변동 — 매번 같은 태그 쓰지 않기
// ============================================================

/**
 * 해시태그 포함 여부 + 개수를 자연스럽게 결정
 * 사람은 해시태그를 항상 넣지도, 항상 빼지도 않는다
 */
export function getHashtagBehavior(platform: Platform): {
  includeHashtags: boolean;
  maxCount: number;
} {
  const roll = Math.random();

  if (platform === 'threads') {
    // Threads: 50% 확률로 해시태그 없음, 50% 확률로 1개
    return { includeHashtags: roll > 0.5, maxCount: 1 };
  }

  if (platform === 'x') {
    // X: 30% 없음, 40% 1개, 20% 2개, 10% 0개(이모지로 대체)
    if (roll < 0.3) return { includeHashtags: false, maxCount: 0 };
    if (roll < 0.7) return { includeHashtags: true, maxCount: 1 };
    return { includeHashtags: true, maxCount: 2 };
  }

  // Medium: 태그는 별도 관리
  return { includeHashtags: true, maxCount: 5 };
}

// ============================================================
// 8. 이모지 사용 변동
// ============================================================

export function getEmojiBehavior(): {
  instruction: string;
} {
  const roll = Math.random();

  if (roll < 0.25) return { instruction: 'No emojis at all today. Just plain text.' };
  if (roll < 0.55) return { instruction: 'Use 1 emoji, placed naturally (not at the start).' };
  if (roll < 0.80) return { instruction: 'Use 2 emojis max, sprinkled naturally.' };
  return { instruction: 'Use 2-3 emojis today, you\'re feeling expressive.' };
}

// ============================================================
// 9. 과거 포스트 인식 — 이전에 쓴 것 기억하기
// ============================================================

/**
 * 최근 포스트 요약을 가져와 프롬프트에 주입
 * "어제 이런 얘기 했으니 오늘은 다른 걸 하자" = 사람의 자연스러운 패턴
 */
export async function getRecentPostContext(
  platform: Platform,
  accountId: string
): Promise<string> {
  const result = await sql`
    SELECT content_type, content, posted_at
    FROM social_posts
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND status = 'success'
    ORDER BY posted_at DESC
    LIMIT 5
  `;

  if (result.rows.length === 0) return '';

  const summaries = result.rows.map(r => {
    const preview = (r.content as string).slice(0, 80);
    return `- [${r.content_type}] "${preview}..."`;
  });

  return `\nIMPORTANT — Your recent posts (DO NOT repeat these topics or angles):
${summaries.join('\n')}
Write something COMPLETELY DIFFERENT from these. Different angle, different hook, different structure.`;
}

// ============================================================
// 10. 인간적 불완전성 주입
// ============================================================

/**
 * 가끔 소문자 시작, 가끔 말줄임표, 가끔 캐주얼한 축약
 * 완벽하게 포맷된 글 = 봇 냄새
 */
export function getImperfectionInstruction(): string {
  const roll = Math.random();

  if (roll < 0.15) {
    return 'Start with a lowercase letter (not capitalized). Feels more casual and real.';
  }
  if (roll < 0.30) {
    return 'Use one casual abbreviation naturally (like "tbh", "ngl", "imo", "lowkey") — just ONE, placed naturally.';
  }
  if (roll < 0.40) {
    return 'End with "..." or a trailing thought instead of a clean period.';
  }
  if (roll < 0.50) {
    return 'Use one em dash (—) mid-sentence for a natural interruption of thought.';
  }
  // 50%: 불완전성 없음 (사람도 가끔 깔끔하게 씀)
  return '';
}

// ============================================================
// 11. 포스트 포맷 변동 — 매번 같은 구조가 아님
// ============================================================

const POST_FORMATS = [
  'statement', // 단정적 진술
  'question',  // 질문으로 시작
  'story',     // 짧은 일화/시나리오
  'list',      // 나열형 (1. 2. 3.)
  'reaction',  // 리액션형 ("just learned that...")
  'hot-take',  // 대담한 의견
] as const;

export function getPostFormat(): string {
  const format = POST_FORMATS[Math.floor(Math.random() * POST_FORMATS.length)];

  switch (format) {
    case 'statement': return 'Write as a confident statement or insight.';
    case 'question': return 'Start with a question that hooks the reader, then answer it.';
    case 'story': return 'Start with a tiny scenario or "imagine this:" moment, then connect to the insight.';
    case 'list': return 'Use a mini numbered or bulleted list (2-3 items).';
    case 'reaction': return 'Write as if you just discovered something ("just realized...", "ok but why does nobody talk about...")';
    case 'hot-take': return 'Frame it as a bold opinion ("unpopular opinion:", "hot take:"). Be confident but not aggressive.';
  }
}

// ============================================================
// 12. 링크 자연스럽게 — 프로모 냄새 제거
// ============================================================

/**
 * 링크 포함 여부를 인간적으로 결정
 * - 연속 2번 링크 금지
 * - 전체의 15% 이하
 * - 주말에는 링크 거의 안 넣음
 */
export async function shouldIncludeLinkHuman(
  platform: Platform,
  accountId: string
): Promise<{ includeLink: boolean; style?: string }> {
  if (platform === 'medium') return { includeLink: false }; // CTA는 본문에

  const dayOfWeek = new Date().getDay();
  const roll = Math.random();

  // 주말: 5%만 링크 (사람은 주말에 프로모 안 함)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    if (roll > 0.05) return { includeLink: false };
  }

  // 마지막 포스트가 링크였으면 이번엔 안 넣음
  const lastPost = await sql`
    SELECT has_link FROM social_posts
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND status = 'success'
    ORDER BY posted_at DESC LIMIT 1
  `;
  if (lastPost.rows.length > 0 && lastPost.rows[0].has_link) {
    return { includeLink: false };
  }

  // 최근 10개 중 링크 비율 체크 (15% 이하 유지)
  const recentLinks = await sql`
    SELECT
      COUNT(*) FILTER (WHERE has_link = TRUE) as link_count,
      COUNT(*) as total
    FROM (
      SELECT has_link FROM social_posts
      WHERE platform = ${platform}
        AND account_id = ${accountId}
        AND status = 'success'
      ORDER BY posted_at DESC LIMIT 10
    ) sub
  `;
  const linkRatio = parseInt(recentLinks.rows[0]?.link_count || '0') / Math.max(parseInt(recentLinks.rows[0]?.total || '1'), 1);
  if (linkRatio >= 0.15) {
    return { includeLink: false };
  }

  // 12% 확률로 링크 포함
  if (roll < 0.12) {
    // 링크 스타일도 다양하게
    const styles = [
      'Mention the link casually at the end, like "btw if you\'re curious: [url]"',
      'Weave the link naturally into the content, not as a separate CTA',
      'Add "link in bio" style reference instead of a direct URL',
    ];
    return {
      includeLink: true,
      style: styles[Math.floor(Math.random() * styles.length)],
    };
  }

  return { includeLink: false };
}

// ============================================================
// HELPER
// ============================================================

/**
 * 결정적 해시 함수 (같은 입력 → 같은 출력)
 * 날짜 기반 결정에 사용 (같은 날 같은 결과)
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // 32bit integer
  }
  return hash;
}
