import { createHash } from 'crypto';
import { getRecentHashes, getCrossAccountHashes } from '@/lib/db/posts';
import { logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform } from '@/lib/db/posts';

/**
 * 콘텐츠의 SHA-256 해시 생성
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
}

/**
 * 간단한 유사도 체크 — 정규화된 텍스트의 n-gram 기반 Jaccard 유사도
 */
function ngramSimilarity(a: string, b: string, n: number = 3): number {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const getNgrams = (s: string) => {
    const normalized = normalize(s);
    const grams = new Set<string>();
    for (let i = 0; i <= normalized.length - n; i++) {
      grams.add(normalized.slice(i, i + n));
    }
    return grams;
  };

  const gramsA = getNgrams(a);
  const gramsB = getNgrams(b);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;

  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection++;
  }
  const union = gramsA.size + gramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.7; // 70% 이상이면 유사한 것으로 판단

/**
 * 동일 계정 내 최근 포스트와 유사도 체크
 */
export async function checkSameAccountSimilarity(
  platform: Platform,
  accountId: string,
  content: string
): Promise<{ allowed: boolean; reason?: string }> {
  const hash = hashContent(content);
  const recentHashes = await getRecentHashes(platform, accountId, 50);

  // 완전 동일 해시 체크
  if (recentHashes.includes(hash)) {
    await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
      check: 'exact_duplicate',
    });
    return { allowed: false, reason: 'Exact duplicate content detected' };
  }

  await logSafetyCheck(platform, accountId, 'similarity', 'pass', {
    check: 'same_account',
    compared: recentHashes.length,
  });
  return { allowed: true };
}

/**
 * 크로스 계정 유사도 체크 (X 멀티계정용)
 */
export async function checkCrossAccountSimilarity(
  platform: Platform,
  accountId: string,
  contentHash: string
): Promise<{ allowed: boolean; reason?: string }> {
  const crossHashes = await getCrossAccountHashes(platform, accountId, 48);

  // 다른 계정에 동일 해시가 있으면 차단
  const duplicate = crossHashes.find(h => h.content_hash === contentHash);
  if (duplicate) {
    await logSafetyCheck(platform, accountId, 'similarity', 'fail', {
      check: 'cross_account_duplicate',
      duplicate_account: duplicate.account_id,
    });
    return {
      allowed: false,
      reason: `Duplicate content found on account: ${duplicate.account_id}`,
    };
  }

  await logSafetyCheck(platform, accountId, 'similarity', 'pass', {
    check: 'cross_account',
    compared: crossHashes.length,
  });
  return { allowed: true };
}

export { ngramSimilarity, SIMILARITY_THRESHOLD };
