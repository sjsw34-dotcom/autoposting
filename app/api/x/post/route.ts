import { NextResponse } from 'next/server';
import { makeHumanDecision, runSafetyChecks, onPostSuccess, onPostFailure } from '@/lib/safety';
import { generateContent } from '@/lib/content/generator';
import { getXContentType, formatXContent } from '@/lib/content/x-format';
import { judgeQuality } from '@/lib/content/quality-judge';
import { postToX, postXThread, getActiveXAccounts } from '@/lib/platforms/x-client';
import { checkMonthlyLimit } from '@/lib/safety/rate-limiter';
import { notifyPostSuccess, notifyPostFailure, notifyForbidden, notifyMonthlyLimitWarning } from '@/lib/notify/telegram';
import { verifyCronSecret, getCurrentSlot, getSlotIndex } from '@/lib/utils';
import { generatePostImages, decideImageCount } from '@/lib/image/generator';
import { generateZodiacFortune, formatZodiacThread } from '@/lib/content/zodiac-fortune';

export const maxDuration = 60;

const MAX_GENERATION_ATTEMPTS = 3;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = getActiveXAccounts();
  if (accounts.length === 0) {
    return NextResponse.json({ status: 'skipped', reason: 'No active X accounts' });
  }

  const slot = getCurrentSlot();
  const slotIndex = getSlotIndex();
  const results: Record<string, unknown>[] = [];

  for (const account of accounts) {
    const accountId = account.username;

    // STEP 0: 인간 행동 결정
    const humanDecision = await makeHumanDecision('x', accountId, slotIndex);
    if (!humanDecision.shouldPost) {
      results.push({ account: accountId, status: 'human_skip', reason: humanDecision.reason });
      continue;
    }

    try {
      const monthly = await checkMonthlyLimit('x', accountId);
      if (monthly.warning) {
        await notifyMonthlyLimitWarning('x', accountId, monthly.current, monthly.limit);
      }

      // ===== 아침: 띠별 운세 스레드 =====
      if (slot === 'morning') {
        const fortune = generateZodiacFortune();
        const threadTweets = formatZodiacThread(fortune);
        const threadContent = threadTweets.join('\n---\n');

        const result = await postXThread(threadTweets, account.accountNumber);

        if (result.success) {
          await onPostSuccess('x', accountId, threadContent, slot, 'fortune', 'sajumuse', false, result.id, false);
          await notifyPostSuccess('x', accountId, 'fortune');
          results.push({ account: accountId, status: 'success', postId: result.id, type: 'zodiac_thread', tweets: threadTweets.length });
        } else {
          const { circuitOpened, isHttpForbidden } = await onPostFailure(
            'x', accountId, threadContent, slot, 'fortune', 'sajumuse',
            result.error || 'Unknown error', result.errorCode
          );
          await notifyPostFailure('x', accountId, result.error || 'Unknown', circuitOpened);
          if (isHttpForbidden) await notifyForbidden('x', accountId);
          results.push({ account: accountId, status: 'failed', error: result.error });
        }
        continue;
      }

      // ===== 점심/저녁: AI 생성 콘텐츠 =====
      const contentType = getXContentType(slot);

      let formattedText = '';
      let generated;
      let lastRejectReason = '';

      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        generated = await generateContent('x', contentType, {
          includeLink: humanDecision.includeLink,
          linkUrl: humanDecision.linkUrl,
          linkStyle: humanDecision.linkStyle,
          accountId,
        });
        formattedText = formatXContent(generated.text);

        // Safety check (AI detection, spam, similarity)
        const safety = await runSafetyChecks('x', accountId, formattedText);
        if (!safety.allowed) {
          lastRejectReason = `safety: ${safety.reason || ''}`;
          console.log(`[RETRY ${attempt + 1}] X @${accountId} safety fail: ${safety.reason}`);
          if (attempt === MAX_GENERATION_ATTEMPTS - 1) {
            results.push({ account: accountId, status: 'safety_blocked', reason: lastRejectReason });
            generated = undefined;
          }
          continue;
        }

        // Quality judge (engagement potential)
        const quality = await judgeQuality(formattedText, 'x', contentType, accountId);
        if (!quality.passed) {
          lastRejectReason = `quality: ${quality.totalScore}/50 — ${quality.feedback}`;
          console.log(`[RETRY ${attempt + 1}] X @${accountId} quality fail (${quality.totalScore}/50): ${quality.feedback}`);
          if (attempt === MAX_GENERATION_ATTEMPTS - 1) {
            // 마지막 시도도 품질 미달이면 그래도 발행 (완전 차단보다 나음)
            console.log(`[QUALITY] X @${accountId} posting despite low score (${quality.totalScore}/50)`);
            break;
          }
          continue;
        }

        console.log(`[QUALITY] X @${accountId} passed (${quality.totalScore}/50)`);
        break;
      }

      if (!generated) continue;

      // 이미지 생성 (human behavior가 결정)
      let imageBuffers: Buffer[] | undefined;
      let imageUrls: string[] | undefined;
      if (humanDecision.includeImage) {
        try {
          const imageCount = decideImageCount();
          const imageResult = await generatePostImages(contentType, 'x', imageCount, formattedText);
          imageUrls = imageResult.imageUrls;
          imageBuffers = await Promise.all(
            imageUrls.map(async (url) => {
              const res = await fetch(url);
              return Buffer.from(await res.arrayBuffer());
            })
          );
        } catch (err) {
          console.warn(`[IMAGE] X @${accountId} image generation failed, posting text-only:`, err);
        }
      }

      // 포스팅
      const result = await postToX(formattedText, account.accountNumber, imageBuffers);

      if (result.success) {
        const hasImage = !!imageUrls && imageUrls.length > 0;
        const imageUrlStr = imageUrls?.join(',');
        await onPostSuccess('x', accountId, formattedText, slot, contentType, generated.brand, generated.hasLink, result.id, hasImage, imageUrlStr);
        await notifyPostSuccess('x', accountId, contentType);
        results.push({ account: accountId, status: 'success', postId: result.id, images: imageUrls?.length || 0 });
      } else {
        const { circuitOpened, isHttpForbidden } = await onPostFailure(
          'x', accountId, formattedText, slot, contentType, generated.brand,
          result.error || 'Unknown error', result.errorCode
        );
        await notifyPostFailure('x', accountId, result.error || 'Unknown', circuitOpened);
        if (isHttpForbidden) await notifyForbidden('x', accountId);
        results.push({ account: accountId, status: 'failed', error: result.error });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`X @${accountId} error:`, message);
      await notifyPostFailure('x', accountId, message, false);
      results.push({ account: accountId, status: 'error', error: message });
    }

    // 멀티계정은 별도 cron으로 분리 (Vercel 10초 제한)
  }

  return NextResponse.json({ status: 'completed', results });
}
