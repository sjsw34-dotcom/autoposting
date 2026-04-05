import { NextResponse } from 'next/server';
import { makeHumanDecision, runSafetyChecks, onPostSuccess, onPostFailure } from '@/lib/safety';
import { generateContent, insertMediumCTAs } from '@/lib/content/generator';
import { getMediumContentType, parseMediumContent } from '@/lib/content/medium-format';
import { postToMedium } from '@/lib/platforms/medium-client';
import { notifyPostSuccess, notifyPostFailure } from '@/lib/notify/telegram';
import { verifyCronSecret, getCurrentSlot } from '@/lib/utils';
import { generatePostImages, decideImageCount } from '@/lib/image/generator';

export const maxDuration = 60;

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

    // STEP 2.5: 이미지 생성 (Medium은 항상 이미지 포함)
    let imageUrls: string[] | undefined;
    if (humanDecision.includeImage) {
      try {
        const imageCount = decideImageCount();
        const imageResult = await generatePostImages(contentType, 'medium', imageCount);
        imageUrls = imageResult.imageUrls;
      } catch (err) {
        console.warn(`[IMAGE] Medium image generation failed, posting text-only:`, err);
      }
    }

    // STEP 3: 포맷팅 + CTA 삽입
    const parsed = parseMediumContent(generated.text);
    const contentWithCTAs = insertMediumCTAs(parsed.content);

    // 이미지를 마크다운에 삽입
    let finalContent = contentWithCTAs;
    if (imageUrls && imageUrls.length > 0) {
      // 헤더 이미지
      finalContent = `![](${imageUrls[0]})\n\n${finalContent}`;
      // 2장째는 본문 중간에 삽입
      if (imageUrls.length >= 2) {
        const lines = finalContent.split('\n');
        const midPoint = Math.floor(lines.length * 0.5);
        lines.splice(midPoint, 0, `\n![](${imageUrls[1]})\n`);
        finalContent = lines.join('\n');
      }
    }

    // STEP 4: 발행
    const result = await postToMedium({
      title: parsed.title,
      content: finalContent,
      tags: parsed.tags,
      publishStatus: 'public',
    });

    const hasImage = !!imageUrls && imageUrls.length > 0;
    const imageUrlStr = imageUrls?.join(',');

    if (result.success) {
      await onPostSuccess('medium', accountId, generated.text, slot, contentType, generated.brand, true, result.id, hasImage, imageUrlStr);
      await notifyPostSuccess('medium', accountId, contentType);
      return NextResponse.json({ status: 'success', postId: result.id, url: result.url, images: imageUrls?.length || 0 });
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
