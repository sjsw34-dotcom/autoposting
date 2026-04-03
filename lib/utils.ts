import type { Slot } from '@/lib/db/posts';

/**
 * 현재 UTC 시간을 기반으로 슬롯 결정
 */
export function getCurrentSlot(): Slot {
  const hour = new Date().getUTCHours();

  // UTC 기준 Cron 시간에 매핑
  // 23:00 UTC (08:00 KST) → morning
  // 03:00 UTC (12:00 KST) → lunch
  // 10:00 UTC (19:00 KST) → evening
  if (hour >= 20 || hour < 1) return 'morning';
  if (hour >= 1 && hour < 7) return 'lunch';
  return 'evening';
}

/**
 * 현재 슬롯의 인덱스 (인간 행동 엔진에서 사용)
 * 0=아침, 1=점심, 2=저녁
 */
export function getSlotIndex(): number {
  const slot = getCurrentSlot();
  switch (slot) {
    case 'morning': return 0;
    case 'lunch': return 1;
    case 'evening': return 2;
  }
}

/**
 * Cron 인증 체크
 */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const cronSecret = request.headers.get('x-vercel-cron');
  return cronSecret === '1';
}
