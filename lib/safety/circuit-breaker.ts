import {
  getCircuitBreaker,
  upsertCircuitBreaker,
  logSafetyCheck,
  type CircuitStatus,
} from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

const MAX_CONSECUTIVE_FAILURES = 3;
const OPEN_DURATION_MS = 24 * 60 * 60 * 1000; // 24시간 휴식
const HALF_OPEN_DURATION_MS = 2 * 60 * 60 * 1000; // 2시간 후 테스트

/**
 * 서킷 브레이커 상태 확인 — 포스팅 허용 여부 반환
 */
export async function isCircuitClosed(
  platform: Platform,
  accountId: string
): Promise<{ allowed: boolean; status: CircuitStatus; reason?: string }> {
  const cb = await getCircuitBreaker(platform, accountId);

  // 서킷 브레이커 레코드 없으면 정상 (closed)
  if (!cb) {
    return { allowed: true, status: 'closed' };
  }

  if (cb.status === 'closed') {
    return { allowed: true, status: 'closed' };
  }

  if (cb.status === 'open') {
    // resume_after 시간이 지났으면 half-open으로 전환
    if (cb.resume_after && new Date(cb.resume_after) <= new Date()) {
      await upsertCircuitBreaker(platform, accountId, 'half-open', cb.consecutive_failures);
      await logSafetyCheck(platform, accountId, 'circuit_breaker', 'warn', {
        transition: 'open -> half-open',
      });
      return { allowed: true, status: 'half-open' };
    }

    await logSafetyCheck(platform, accountId, 'circuit_breaker', 'fail', {
      status: 'open',
      resume_after: cb.resume_after,
    });
    return {
      allowed: false,
      status: 'open',
      reason: `Circuit open until ${cb.resume_after}`,
    };
  }

  // half-open: 1회 테스트 허용
  return { allowed: true, status: 'half-open' };
}

/**
 * 포스팅 성공 시 호출 — 서킷 리셋
 */
export async function recordSuccess(platform: Platform, accountId: string) {
  await upsertCircuitBreaker(platform, accountId, 'closed', 0);
  await logSafetyCheck(platform, accountId, 'circuit_breaker', 'pass', {
    action: 'reset_on_success',
  });
}

/**
 * 포스팅 실패 시 호출 — 연속 실패 카운터 증가, 임계값 초과 시 서킷 오픈
 */
export async function recordFailure(
  platform: Platform,
  accountId: string,
  errorCode?: number
): Promise<{ circuitOpened: boolean; isHttpForbidden: boolean }> {
  const isHttpForbidden = errorCode === 403;
  const cb = await getCircuitBreaker(platform, accountId);
  const failures = (cb?.consecutive_failures || 0) + 1;

  // HTTP 403은 즉시 오픈 (계정 차단 의심)
  if (isHttpForbidden) {
    const resumeAfter = new Date(Date.now() + OPEN_DURATION_MS * 7); // 7일 중단
    await upsertCircuitBreaker(platform, accountId, 'open', failures, resumeAfter);
    await logSafetyCheck(platform, accountId, 'circuit_breaker', 'fail', {
      action: 'emergency_open_403',
      failures,
    });
    return { circuitOpened: true, isHttpForbidden: true };
  }

  if (failures >= MAX_CONSECUTIVE_FAILURES) {
    const resumeAfter = new Date(Date.now() + OPEN_DURATION_MS);
    await upsertCircuitBreaker(platform, accountId, 'open', failures, resumeAfter);
    await logSafetyCheck(platform, accountId, 'circuit_breaker', 'fail', {
      action: 'circuit_opened',
      failures,
    });
    return { circuitOpened: true, isHttpForbidden: false };
  }

  await upsertCircuitBreaker(
    platform,
    accountId,
    cb?.status || 'closed',
    failures
  );
  await logSafetyCheck(platform, accountId, 'circuit_breaker', 'warn', {
    action: 'failure_recorded',
    failures,
    threshold: MAX_CONSECUTIVE_FAILURES,
  });
  return { circuitOpened: false, isHttpForbidden: false };
}
