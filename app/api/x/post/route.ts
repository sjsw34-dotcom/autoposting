import { NextResponse } from 'next/server';
import { makeHumanDecision, runSafetyChecks, onPostSuccess, onPostFailure } from '@/lib/safety';
import { generateContent } from '@/lib/content/generator';
import { getXContentType, formatXContent } from '@/lib/content/x-format';
import { postToX, getActiveXAccounts } from '@/lib/platforms/x-client';
import { checkMonthlyLimit } from '@/lib/safety/rate-limiter';
import { notifyPostSuccess, notifyPostFailure, notifyForbidden, notifyMonthlyLimitWarning } from '@/lib/notify/telegram';
import { verifyCronSecret, getCurrentSlot, getSlotIndex } from '@/lib/utils';

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

    // 인간적 딜레이
    if (humanDecision.delaySeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, humanDecision.delaySeconds * 1000));
    }

    const contentType = getXContentType(slot);

    try {
      const monthly = await checkMonthlyLimit('x', accountId);
      if (monthly.warning) {
        await notifyMonthlyLimitWarning('x', accountId, monthly.current, monthly.limit);
      }

      // STEP 1+2: 생성 + 안전 체크 (재생성 루프)
      let formattedText = '';
      let generated;
      let lastSafetyReason = '';

      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        generated = await generateContent('x', contentType, {
          includeLink: humanDecision.includeLink,
          linkStyle: humanDecision.linkStyle,
          accountId,
        });
        formattedText = formatXContent(generated.text);

        const safety = await runSafetyChecks('x', accountId, formattedText);
        if (safety.allowed) break;

        lastSafetyReason = safety.reason || '';
        console.log(`[RETRY ${attempt + 1}] X @${accountId} regenerating: ${lastSafetyReason}`);

        if (attempt === MAX_GENERATION_ATTEMPTS - 1) {
          results.push({ account: accountId, status: 'safety_blocked', reason: lastSafetyReason });
          generated = undefined;
        }
      }

      if (!generated) continue;

      // STEP 3: 포스팅
      const result = await postToX(formattedText, account.accountNumber);

      if (result.success) {
        await onPostSuccess('x', accountId, formattedText, slot, contentType, generated.brand, generated.hasLink, result.id);
        await notifyPostSuccess('x', accountId, contentType);
        results.push({ account: accountId, status: 'success', postId: result.id });
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

    // 멀티계정 시 자연스러운 딜레이
    if (accounts.length > 1) {
      const switchDelay = 120000 + Math.random() * 180000;
      await new Promise(resolve => setTimeout(resolve, switchDelay));
    }
  }

  return NextResponse.json({ status: 'completed', results });
}
