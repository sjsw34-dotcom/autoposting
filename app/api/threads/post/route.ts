import { NextResponse } from 'next/server';
import { makeHumanDecision, runSafetyChecks, onPostSuccess, onPostFailure } from '@/lib/safety';
import { generateContent } from '@/lib/content/generator';
import { getThreadsContentType, formatThreadsContent } from '@/lib/content/threads-format';
import { postToThreads } from '@/lib/platforms/threads-client';
import { notifyPostSuccess, notifyPostFailure, notifyForbidden } from '@/lib/notify/telegram';
import { verifyCronSecret, getCurrentSlot, getSlotIndex } from '@/lib/utils';

const MAX_GENERATION_ATTEMPTS = 3;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountId = process.env.THREADS_USER_ID || 'sajumuse';
  const slot = getCurrentSlot();
  const slotIndex = getSlotIndex();

  // STEP 0: 인간 행동 결정
  const humanDecision = await makeHumanDecision('threads', accountId, slotIndex);
  if (!humanDecision.shouldPost) {
    return NextResponse.json({
      status: 'human_skip',
      reason: humanDecision.reason,
    });
  }

  // 인간적 딜레이
  if (humanDecision.delaySeconds > 0) {
    await new Promise(resolve => setTimeout(resolve, humanDecision.delaySeconds * 1000));
  }

  const contentType = getThreadsContentType(slot);

  try {
    // STEP 1+2: 콘텐츠 생성 + 안전 체크 (AI 패턴 감지 시 재생성)
    let formattedText = '';
    let generated;
    let lastSafetyReason = '';

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      generated = await generateContent('threads', contentType, {
        includeLink: humanDecision.includeLink,
        linkStyle: humanDecision.linkStyle,
        accountId,
      });
      formattedText = formatThreadsContent(generated.text);

      const safety = await runSafetyChecks('threads', accountId, formattedText);
      if (safety.allowed) break;

      lastSafetyReason = safety.reason || '';
      console.log(`[RETRY ${attempt + 1}] Threads regenerating: ${lastSafetyReason}`);

      if (attempt === MAX_GENERATION_ATTEMPTS - 1) {
        return NextResponse.json({
          status: 'safety_blocked',
          reason: lastSafetyReason,
          attempts: MAX_GENERATION_ATTEMPTS,
        });
      }
    }

    if (!generated) {
      return NextResponse.json({ status: 'error', error: 'Generation failed' }, { status: 500 });
    }

    // STEP 3: 포스팅
    const result = await postToThreads(formattedText);

    if (result.success) {
      await onPostSuccess('threads', accountId, formattedText, slot, contentType, generated.brand, generated.hasLink, result.id);
      await notifyPostSuccess('threads', accountId, contentType);
      return NextResponse.json({ status: 'success', postId: result.id });
    }

    const { circuitOpened, isHttpForbidden } = await onPostFailure(
      'threads', accountId, formattedText, slot, contentType, generated.brand,
      result.error || 'Unknown error'
    );
    await notifyPostFailure('threads', accountId, result.error || 'Unknown', circuitOpened);
    if (isHttpForbidden) await notifyForbidden('threads', accountId);

    return NextResponse.json({ status: 'failed', error: result.error }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Threads post error:', message);
    await notifyPostFailure('threads', accountId, message, false);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
