import { sql } from './client';
import type { Platform } from './posts';

export type CheckType = 'similarity' | 'rate_limit' | 'circuit_breaker' | 'warmup';
export type CheckResult = 'pass' | 'fail' | 'warn';

export async function logSafetyCheck(
  platform: Platform,
  accountId: string,
  checkType: CheckType,
  result: CheckResult,
  details?: Record<string, unknown>
) {
  await sql`
    INSERT INTO social_safety_log (platform, account_id, check_type, result, details)
    VALUES (${platform}, ${accountId}, ${checkType}, ${result}, ${JSON.stringify(details || {})})
  `;
}

export async function getRecentSafetyLogs(
  platform: Platform,
  accountId: string,
  hours: number = 24
) {
  const result = await sql`
    SELECT * FROM social_safety_log
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND checked_at > NOW() - INTERVAL '1 hour' * ${hours}
    ORDER BY checked_at DESC
  `;
  return result.rows;
}

// --- Circuit Breaker DB ---

export type CircuitStatus = 'closed' | 'open' | 'half-open';

export async function getCircuitBreaker(platform: Platform, accountId: string) {
  const result = await sql`
    SELECT * FROM social_circuit_breaker
    WHERE platform = ${platform} AND account_id = ${accountId}
  `;
  return result.rows[0] as {
    status: CircuitStatus;
    consecutive_failures: number;
    last_failure_at: Date | null;
    resume_after: Date | null;
  } | undefined;
}

export async function upsertCircuitBreaker(
  platform: Platform,
  accountId: string,
  status: CircuitStatus,
  consecutiveFailures: number,
  resumeAfter?: Date
) {
  await sql`
    INSERT INTO social_circuit_breaker (platform, account_id, status, consecutive_failures, last_failure_at, resume_after, updated_at)
    VALUES (${platform}, ${accountId}, ${status}, ${consecutiveFailures}, NOW(), ${resumeAfter?.toISOString() || null}, NOW())
    ON CONFLICT (platform, account_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      consecutive_failures = EXCLUDED.consecutive_failures,
      last_failure_at = CASE WHEN EXCLUDED.consecutive_failures > 0 THEN NOW() ELSE social_circuit_breaker.last_failure_at END,
      resume_after = EXCLUDED.resume_after,
      updated_at = NOW()
  `;
}

// --- Monthly Counter ---

export async function getMonthlyCount(platform: Platform, accountId: string) {
  const yearMonth = new Date().toISOString().slice(0, 7); // '2026-04'
  const result = await sql`
    SELECT post_count, limit_count FROM social_monthly_counter
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND year_month = ${yearMonth}
  `;
  if (result.rows.length === 0) {
    return { post_count: 0, limit_count: 500 };
  }
  return result.rows[0] as { post_count: number; limit_count: number };
}

export async function incrementMonthlyCount(platform: Platform, accountId: string) {
  const yearMonth = new Date().toISOString().slice(0, 7);
  await sql`
    INSERT INTO social_monthly_counter (platform, account_id, year_month, post_count, updated_at)
    VALUES (${platform}, ${accountId}, ${yearMonth}, 1, NOW())
    ON CONFLICT (platform, account_id, year_month)
    DO UPDATE SET
      post_count = social_monthly_counter.post_count + 1,
      updated_at = NOW()
  `;
}

// --- Config ---

export interface SocialConfig {
  platform: Platform;
  account_id: string;
  brand: string;
  niche: string;
  link_url: string | null;
  is_active: boolean;
  warmup_start_date: string | null;
  warmup_complete: boolean;
  post_times: Record<string, string[]> | null;
}

export async function getActiveAccounts(platform?: Platform) {
  const result = platform
    ? await sql`SELECT * FROM social_config WHERE platform = ${platform} AND is_active = TRUE`
    : await sql`SELECT * FROM social_config WHERE is_active = TRUE`;
  return result.rows as SocialConfig[];
}

export async function getAccountConfig(platform: Platform, accountId: string) {
  const result = await sql`
    SELECT * FROM social_config
    WHERE platform = ${platform} AND account_id = ${accountId}
  `;
  return result.rows[0] as SocialConfig | undefined;
}
