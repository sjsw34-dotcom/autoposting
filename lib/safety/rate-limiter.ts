import { getTodayPostCount } from '@/lib/db/posts';
import { getMonthlyCount, incrementMonthlyCount, logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

const DAILY_LIMITS: Record<string, number> = {
  x: 3,       // 계정당 3회/일
};

const MONTHLY_WARNING_THRESHOLD = 0.8; // 80% 도달 시 경고

/**
 * 일일 한도 체크
 */
export async function checkDailyLimit(
  platform: Platform,
  accountId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const todayCount = await getTodayPostCount(platform, accountId);
  const limit = DAILY_LIMITS[platform] || 3;

  if (todayCount >= limit) {
    await logSafetyCheck(platform, accountId, 'rate_limit', 'fail', {
      check: 'daily_limit',
      current: todayCount,
      limit,
    });
    return { allowed: false, current: todayCount, limit };
  }

  await logSafetyCheck(platform, accountId, 'rate_limit', 'pass', {
    check: 'daily_limit',
    current: todayCount,
    limit,
  });
  return { allowed: true, current: todayCount, limit };
}

/**
 * 월간 한도 체크 (주로 X용)
 */
export async function checkMonthlyLimit(
  platform: Platform,
  accountId: string
): Promise<{ allowed: boolean; current: number; limit: number; warning: boolean }> {
  const { post_count, limit_count } = await getMonthlyCount(platform, accountId);
  const warning = post_count >= limit_count * MONTHLY_WARNING_THRESHOLD;

  if (post_count >= limit_count) {
    await logSafetyCheck(platform, accountId, 'rate_limit', 'fail', {
      check: 'monthly_limit',
      current: post_count,
      limit: limit_count,
    });
    return { allowed: false, current: post_count, limit: limit_count, warning };
  }

  if (warning) {
    await logSafetyCheck(platform, accountId, 'rate_limit', 'warn', {
      check: 'monthly_limit_approaching',
      current: post_count,
      limit: limit_count,
    });
  }

  return { allowed: true, current: post_count, limit: limit_count, warning };
}

/**
 * 포스팅 성공 후 월간 카운터 증가
 */
export async function recordPost(platform: Platform, accountId: string) {
  await incrementMonthlyCount(platform, accountId);
}
