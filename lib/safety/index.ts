import { checkMinGap } from './timing-engine';
import { checkContent } from './content-guard';
import { checkSameAccountSimilarity, checkCrossAccountSimilarity, hashContent } from './similarity-check';
import { isCircuitClosed, recordSuccess, recordFailure } from './circuit-breaker';
import { checkDailyLimit, checkMonthlyLimit, recordPost } from './rate-limiter';
import { getWarmupLimit } from './warmup-manager';
import {
  shouldSkipToday,
  getTodayEnergy,
  shouldPostThisSlot,
  getHumanDelay,
  shouldIncludeLinkHuman,
  shouldIncludeImage,
} from './human-behavior';
import type { Platform, ContentType, Slot, Brand } from '@/lib/db/posts';
import { insertPost } from '@/lib/db/posts';

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  layer?: string;
}

export interface HumanDecision {
  shouldPost: boolean;
  reason?: string;
  todayEnergy: number;
  includeLink: boolean;
  linkUrl?: string;
  linkStyle?: string;
  includeImage: boolean;
  delaySeconds: number;
}

/**
 * ============================================================
 * 인간 행동 결정 — 안전 체크보다 먼저 실행
 * "오늘 포스팅 할까 말까"를 사람처럼 결정
 * ============================================================
 */
export async function makeHumanDecision(
  platform: Platform,
  accountId: string,
  slotIndex: number // 0=아침, 1=점심, 2=저녁
): Promise<HumanDecision> {
  // 1. 오늘 쉬는 날?
  const skipCheck = await shouldSkipToday(platform, accountId);
  if (skipCheck.skip) {
    return {
      shouldPost: false,
      reason: skipCheck.reason,
      todayEnergy: 0,
      includeLink: false,
      includeImage: false,
      delaySeconds: 0,
    };
  }

  // 2. 오늘의 에너지 (몇 개 올릴지)
  const energy = getTodayEnergy(platform, accountId);

  // 3. 이 슬롯에 올릴지
  const postThisSlot = shouldPostThisSlot(platform, accountId, slotIndex, energy);
  if (!postThisSlot) {
    return {
      shouldPost: false,
      reason: `Skipping slot ${slotIndex} (today energy: ${energy})`,
      todayEnergy: energy,
      includeLink: false,
      includeImage: false,
      delaySeconds: 0,
    };
  }

  // 4. 링크 포함 여부 (인간적으로)
  const linkDecision = await shouldIncludeLinkHuman(platform, accountId);

  // 5. 이미지 포함 여부
  const imageDecision = await shouldIncludeImage(platform, accountId);

  // 6. 포스팅 전 딜레이 (사람은 바로 안 올림)
  const delay = getHumanDelay();

  return {
    shouldPost: true,
    todayEnergy: energy,
    includeLink: linkDecision.includeLink,
    linkUrl: linkDecision.linkUrl,
    linkStyle: linkDecision.style,
    includeImage: imageDecision,
    delaySeconds: delay,
  };
}

/**
 * ============================================================
 * 기술적 안전 체크 파이프라인 (6겹)
 * 인간 행동 결정 통과 후 실행
 * ============================================================
 */
export async function runSafetyChecks(
  platform: Platform,
  accountId: string,
  content: string
): Promise<SafetyCheckResult> {
  // Layer 5: 서킷 브레이커
  const circuit = await isCircuitClosed(platform, accountId);
  if (!circuit.allowed) {
    return { allowed: false, reason: circuit.reason, layer: 'circuit_breaker' };
  }

  // Layer 4: 웜업 + 일일 한도
  const warmup = await getWarmupLimit(platform, accountId);
  const daily = await checkDailyLimit(platform, accountId);

  if (!daily.allowed) {
    return { allowed: false, reason: `Daily limit reached: ${daily.current}/${daily.limit}`, layer: 'rate_limit' };
  }
  if (warmup.inWarmup && warmup.maxPosts !== null && daily.current >= warmup.maxPosts) {
    return { allowed: false, reason: `Warmup day ${warmup.day}: max ${warmup.maxPosts} posts`, layer: 'warmup' };
  }

  // Layer 4: 월간 한도 (X 전용)
  if (platform === 'x') {
    const monthly = await checkMonthlyLimit(platform, accountId);
    if (!monthly.allowed) {
      return { allowed: false, reason: `Monthly limit reached: ${monthly.current}/${monthly.limit}`, layer: 'rate_limit' };
    }
  }

  // Layer 1: 타이밍 (최소 간격)
  const gap = await checkMinGap(platform, accountId);
  if (!gap.allowed) {
    return { allowed: false, reason: `Too soon, wait ${Math.ceil(gap.waitMs / 60000)} minutes`, layer: 'timing' };
  }

  // Layer 6: 콘텐츠 안전 필터
  const contentCheck = await checkContent(platform, accountId, content);
  if (!contentCheck.allowed) {
    return { allowed: false, reason: contentCheck.reason, layer: 'content_guard' };
  }

  // Layer 2: 유사도 체크 (동일 계정)
  const similarity = await checkSameAccountSimilarity(platform, accountId, content);
  if (!similarity.allowed) {
    return { allowed: false, reason: similarity.reason, layer: 'similarity' };
  }

  // Layer 2: 크로스 계정 유사도 (X 멀티계정)
  if (platform === 'x') {
    const cross = await checkCrossAccountSimilarity(platform, accountId, hashContent(content));
    if (!cross.allowed) {
      return { allowed: false, reason: cross.reason, layer: 'cross_similarity' };
    }
  }

  return { allowed: true };
}

/**
 * 포스팅 성공 기록
 */
export async function onPostSuccess(
  platform: Platform,
  accountId: string,
  content: string,
  slot: Slot,
  contentType: ContentType,
  brand: Brand,
  hasLink: boolean,
  platformPostId?: string,
  hasImage?: boolean,
  imageUrl?: string
) {
  await recordSuccess(platform, accountId);
  await recordPost(platform, accountId);
  await insertPost({
    platform,
    account_id: accountId,
    slot,
    content_type: contentType,
    content,
    content_hash: hashContent(content),
    has_link: hasLink,
    has_image: hasImage,
    image_url: imageUrl,
    brand,
    platform_post_id: platformPostId,
    status: 'success',
  });
}

/**
 * 포스팅 실패 기록
 */
export async function onPostFailure(
  platform: Platform,
  accountId: string,
  content: string,
  slot: Slot,
  contentType: ContentType,
  brand: Brand,
  errorMessage: string,
  errorCode?: number
) {
  const { circuitOpened, isHttpForbidden } = await recordFailure(platform, accountId, errorCode);
  await insertPost({
    platform,
    account_id: accountId,
    slot,
    content_type: contentType,
    content,
    content_hash: hashContent(content),
    has_link: false,
    brand,
    status: 'failed',
    error_message: errorMessage,
  });
  return { circuitOpened, isHttpForbidden };
}

export { hashContent } from './similarity-check';
