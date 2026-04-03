import { NextResponse } from 'next/server';
import { makeHumanDecision, runSafetyChecks, onPostSuccess, onPostFailure } from '@/lib/safety';
import { generateContent, insertMediumCTAs } from '@/lib/content/generator';
import { getMediumContentType, parseMediumContent } from '@/lib/content/medium-format';
import { postToMedium } from '@/lib/platforms/medium-client';
import { notifyPostSuccess, notifyPostFailure } from '@/lib/notify/telegram';
import { verifyCronSecret, getCurrentSlot } from '@/lib/utils';

const MAX_GENERATION_ATTEMPTS = 3;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = getMediumContentType();
  if (!contentType) {
    return NextResponse.json({ status: 'skipped', reason: 'Not a posting day' });
  }

  const accountId = process.env.MEDIUM_AUTHOR_ID || 'ksajukim';
  const slot = getCurrentSlot();

  // STEP 0: 인간 행동 결정
  const humanDecision = await makeHumanDecision('medium', accountId, 0);
  if (!humanDecision.shouldPost) {
    return NextResponse.json({ status: 'human_skip', reason: humanDecision.reason });
  }

  // Medium은 "글 쓰는 시간" 시뮬레이션 (더 긴 딜레이)
  const writingDelay = humanDecision.delaySeconds * 2;
  if (writingDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, writingDelay * 1000));
  }

  try {
    // STEP 1+2: 생성 + 안전 체크 (재생성 루프)
    let generated;
    let lastSafetyReason = '';

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      generated = await generateContent('medium', contentType, { accountId });

      const safety = await runSafetyChecks('medium', accountId, generated.text);
      if (safety.allowed) break;

      lastSafetyReason = safety.reason || '';
      console.log(`[RETRY ${attempt + 1}] Medium regenerating: ${lastSafetyReason}`);

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

    // STEP 3: 포맷팅 + CTA 삽입
    const parsed = parseMediumContent(generated.text);
    const contentWithCTAs = insertMediumCTAs(parsed.content);

    // STEP 4: 발행
    const result = await postToMedium({
      title: parsed.title,
      content: contentWithCTAs,
      tags: parsed.tags,
      publishStatus: 'public',
    });

    if (result.success) {
      await onPostSuccess('medium', accountId, generated.text, slot, contentType, generated.brand, true, result.id);
      await notifyPostSuccess('medium', accountId, contentType);
      return NextResponse.json({ status: 'success', postId: result.id, url: result.url });
    }

    await onPostFailure('medium', accountId, generated.text, slot, contentType, generated.brand, result.error || 'Unknown error');
    await notifyPostFailure('medium', accountId, result.error || 'Unknown', false);
    return NextResponse.json({ status: 'failed', error: result.error }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Medium post error:', message);
    await notifyPostFailure('medium', accountId, message, false);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
