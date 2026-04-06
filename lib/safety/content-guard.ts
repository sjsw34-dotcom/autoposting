import { logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

interface ContentGuardResult {
  allowed: boolean;
  reason?: string;
}

const PLATFORM_LIMITS: Record<string, { minLength: number; maxLength: number; maxHashtags: number }> = {
  x: { minLength: 10, maxLength: 280, maxHashtags: 3 },
};

// 스팸 금지어
const BANNED_WORDS = [
  'casino', 'gambling', 'crypto pump', 'get rich quick',
  'make money fast', 'click here now', 'limited time offer',
  'act now', 'buy now', '100% guaranteed',
];

// AI가 즐겨 쓰는 패턴 — 이런 게 있으면 생성 실패로 처리
const AI_TELLTALE_PHRASES = [
  'delve', 'tapestry', 'landscape', 'it\'s important to note',
  'in today\'s world', 'without further ado', 'let\'s dive in',
  'here\'s the thing:', 'here\'s why:', 'game-changer',
  'in conclusion', 'to summarize', 'in summary',
  'first and foremost', 'last but not least',
  'stands as a testament', 'a testament to',
  'rich tapestry', 'rich heritage', 'holistic approach',
  'it is worth noting', 'it should be noted',
  'leverage', 'synergy', 'paradigm shift',
  'navigate the complexities', 'embrace the',
  'foster a sense of', 'unlock your potential',
  'elevate your', 'embark on a journey',
  'in the realm of', 'at the end of the day',
];

// AI의 구조적 패턴 감지
const AI_STRUCTURAL_PATTERNS: { pattern: RegExp; name: string }[] = [
  // "Whether you... or..." 패턴
  { pattern: /whether you .{10,} or .{10,},/i, name: 'whether_or_pattern' },
  // 3연속 동일 구조 (트라이어드)
  { pattern: /(\w+ing \w+), (\w+ing \w+), and (\w+ing \w+)/i, name: 'triad_gerund' },
  // "Not only... but also..." (AI 좋아함)
  { pattern: /not only .{5,} but also/i, name: 'not_only_but_also' },
  // "From X to Y" 반복
  { pattern: /from \w+ to \w+.{0,20}from \w+ to \w+/i, name: 'from_to_repetition' },
  // 콜론 + 리스트 (짧은 포스트에서)
  { pattern: /:\s*\n\s*[-•\d]/m, name: 'colon_list_in_short_post' },
];

/**
 * 콘텐츠 안전 필터 + AI 탐지 패턴 체크
 */
export async function checkContent(
  platform: Platform,
  accountId: string,
  content: string
): Promise<ContentGuardResult> {
  const limits = PLATFORM_LIMITS[platform];
  if (!limits) {
    return { allowed: false, reason: `Unknown platform: ${platform}` };
  }

  // 길이 체크
  if (content.length < limits.minLength) {
    await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
      check: 'content_too_short', length: content.length, min: limits.minLength,
    });
    return { allowed: false, reason: `Content too short: ${content.length}` };
  }
  if (content.length > limits.maxLength) {
    await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
      check: 'content_too_long', length: content.length, max: limits.maxLength,
    });
    return { allowed: false, reason: `Content too long: ${content.length}` };
  }

  // 해시태그 수 체크
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount > limits.maxHashtags) {
    await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
      check: 'too_many_hashtags', count: hashtagCount,
    });
    return { allowed: false, reason: `Too many hashtags: ${hashtagCount}` };
  }

  // 스팸 금지어 체크
  const lowerContent = content.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerContent.includes(word)) {
      await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
        check: 'banned_word', word,
      });
      return { allowed: false, reason: `Banned word: ${word}` };
    }
  }

  // ============================
  // AI 탐지 패턴 체크
  // 이런 표현이 있으면 재생성해야 함
  // ============================
  for (const phrase of AI_TELLTALE_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
        check: 'ai_phrase_detected', phrase,
      });
      return { allowed: false, reason: `AI phrase detected: "${phrase}" — must regenerate` };
    }
  }

  // AI 구조적 패턴 체크
  for (const { pattern, name } of AI_STRUCTURAL_PATTERNS) {
    if (pattern.test(content)) {
      await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
        check: 'ai_structure_detected', pattern: name,
      });
      return { allowed: false, reason: `AI structural pattern: ${name} — must regenerate` };
    }
  }

  // 첫 단어가 "I" 인 경우 (AI의 가장 흔한 시작)
  if (/^I\s/.test(content)) {
    await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
      check: 'starts_with_I',
    });
    return { allowed: false, reason: 'Starts with "I" — too common for AI' };
  }

  await logSafetyCheck(platform, accountId, 'similarity', 'pass', {
    check: 'content_guard_full', length: content.length, hashtags: hashtagCount,
  });
  return { allowed: true };
}
