import { getLastPost } from '@/lib/db/posts';
import { logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

const MAX_JITTER_MS = 90 * 60 * 1000; // ±90분
const MIN_GAP_MS = 3 * 60 * 60 * 1000; // 최소 3시간 간격

/**
 * 랜덤 지터를 추가한 딜레이(ms)를 반환
 * Vercel Cron은 정확한 시간에 호출하므로, 실제 포스팅 전에 이 딜레이만큼 대기
 */
export function getJitterMs(): number {
  // 0 ~ 90분 사이의 랜덤 딜레이 (양방향이 아니라 단방향 — cron이 이미 기본 시간에 호출)
  return Math.floor(Math.random() * MAX_JITTER_MS);
}

/**
 * 마지막 포스트 이후 충분한 간격이 있는지 체크
 */
export async function checkMinGap(
  platform: Platform,
  accountId: string
): Promise<{ allowed: boolean; waitMs: number }> {
  const lastPost = await getLastPost(platform, accountId);

  if (!lastPost) {
    await logSafetyCheck(platform, accountId, 'rate_limit', 'pass', {
      reason: 'no_previous_post',
    });
    return { allowed: true, waitMs: 0 };
  }

  const elapsed = Date.now() - new Date(lastPost.posted_at).getTime();
  const remaining = MIN_GAP_MS - elapsed;

  if (remaining <= 0) {
    await logSafetyCheck(platform, accountId, 'rate_limit', 'pass', {
      elapsed_hours: (elapsed / 3600000).toFixed(1),
    });
    return { allowed: true, waitMs: 0 };
  }

  await logSafetyCheck(platform, accountId, 'rate_limit', 'fail', {
    elapsed_hours: (elapsed / 3600000).toFixed(1),
    wait_minutes: (remaining / 60000).toFixed(0),
  });
  return { allowed: false, waitMs: remaining };
}

/**
 * 지터를 적용하여 실제 대기 시간을 계산
 * Vercel Serverless에서는 긴 sleep이 불가하므로,
 * 이 값은 포스팅 시점 결정에만 사용 (실제 sleep은 하지 않음)
 */
export function shouldPostNow(scheduledSlot: string): boolean {
  // Cron이 호출되면 항상 포스팅 시도 (jitter는 콘텐츠 variation으로 대체)
  // 실제 지터는 cron 시간 자체를 분산시키는 것으로 처리
  return true;
}
