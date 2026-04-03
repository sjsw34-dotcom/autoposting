import { getAccountConfig } from '@/lib/db/safety-log';
import { logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

const WARMUP_DAYS = 14; // 2주 웜업
const WARMUP_SCHEDULE: Record<number, number> = {
  // day: max posts per day
  1: 1, 2: 1, 3: 1,
  4: 1, 5: 2, 6: 2,
  7: 2, 8: 2, 9: 2,
  10: 3, 11: 3, 12: 3,
  13: 3, 14: 3,
};

/**
 * 웜업 기간 중 허용 포스트 수 반환
 * warmup_complete가 true이면 제한 없음 (null 반환)
 */
export async function getWarmupLimit(
  platform: Platform,
  accountId: string
): Promise<{ inWarmup: boolean; maxPosts: number | null; day: number }> {
  const config = await getAccountConfig(platform, accountId);

  if (!config || config.warmup_complete) {
    return { inWarmup: false, maxPosts: null, day: 0 };
  }

  if (!config.warmup_start_date) {
    // 웜업 시작일이 없으면 보수적으로 1회/일
    await logSafetyCheck(platform, accountId, 'warmup', 'warn', {
      reason: 'no_warmup_start_date',
      default_limit: 1,
    });
    return { inWarmup: true, maxPosts: 1, day: 0 };
  }

  const startDate = new Date(config.warmup_start_date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  if (daysDiff > WARMUP_DAYS) {
    // 웜업 기간 지났지만 DB 업데이트 안 된 경우
    await logSafetyCheck(platform, accountId, 'warmup', 'pass', {
      reason: 'warmup_period_exceeded',
      day: daysDiff,
    });
    return { inWarmup: false, maxPosts: null, day: daysDiff };
  }

  const maxPosts = WARMUP_SCHEDULE[daysDiff] || 1;
  await logSafetyCheck(platform, accountId, 'warmup', 'pass', {
    day: daysDiff,
    max_posts: maxPosts,
  });
  return { inWarmup: true, maxPosts, day: daysDiff };
}
