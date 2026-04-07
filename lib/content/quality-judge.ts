import Anthropic from '@anthropic-ai/sdk';
import { logSafetyCheck } from '@/lib/db/safety-log';
import type { Platform, ContentType } from '@/lib/db/posts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface QualityScore {
  passed: boolean;
  totalScore: number;
  axes: {
    hook_power: number;
    emotional_pull: number;
    saju_authenticity: number;
    scroll_stop: number;
    natural_voice: number;
  };
  feedback: string;
}

/**
 * 경쟁사 분석 기반 품질 채점 기준
 * Co-Star/ThePattern/CafeAstrology 등 상위 계정 패턴에서 도출
 *
 * 5축 채점 (각 1-10점, 총 50점 만점)
 * - hook_power: 첫 문장이 스크롤을 멈추게 하는가 (질문형/선언형/대비형 높은 점수)
 * - emotional_pull: 감정적 공감을 유발하는가 (개인적, 구체적, "나 얘기 같은" 느낌)
 * - saju_authenticity: 사주/동양 점성술 고유 앵글이 있는가 (서양에 없는 차별화)
 * - scroll_stop: 짧고 임팩트 있는가 (군더더기 없이 한 방)
 * - natural_voice: 실제 사람이 쓴 것 같은가 (톤, 불완전함, 의견)
 */
const SCORING_CRITERIA = `Score this social media post on 5 axes (1-10 each):

1. HOOK_POWER: Does the first sentence stop the scroll?
   10 = bold question/declaration that demands attention ("Scorpios don't forgive. They just stop caring.")
   5 = decent opening but not memorable
   1 = generic/boring start ("Today's energy is...")

2. EMOTIONAL_PULL: Does it create "this is about ME" feeling?
   10 = hits a specific emotional nerve, feels personal ("that 3am spiral when you know they're wrong but your chart says otherwise")
   5 = somewhat relatable but generic
   1 = informational only, no emotional connection

3. SAJU_AUTHENTICITY: Is the Korean astrology angle unique and specific?
   10 = references Day Master, Five Elements, or Four Pillars in a way Western astrology can't ("Your Wood Day Master explains why you can't stop growing toward people who burn you")
   5 = mentions Saju but could be any astrology
   1 = basically Western astrology with "Saju" label

4. SCROLL_STOP: Is it concise and punchy?
   10 = every word earns its place, strong ending
   5 = decent but could be tighter
   1 = rambling, filler words, weak ending

5. NATURAL_VOICE: Does it sound like a real person?
   10 = has personality, opinions, slight imperfections
   5 = competent but could be anyone
   1 = clearly AI-generated, overly polished

Return ONLY a JSON object:
{
  "hook_power": <number>,
  "emotional_pull": <number>,
  "saju_authenticity": <number>,
  "scroll_stop": <number>,
  "natural_voice": <number>,
  "feedback": "<one sentence: what would make this post better>"
}`;

const PASS_THRESHOLD = 30; // 50점 만점 중 30점 이상 통과 (60%)

export async function judgeQuality(
  content: string,
  platform: Platform,
  contentType: ContentType,
  accountId: string
): Promise<QualityScore> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      temperature: 0,
      system: 'You are a strict content quality judge for a Korean astrology brand. Score honestly — mediocre content hurts the brand. Return ONLY valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `${SCORING_CRITERIA}\n\nPlatform: ${platform}\nContent type: ${contentType}\n\nPOST:\n${content}`,
      }],
    });

    let text = '';
    for (const block of message.content) {
      if (block.type === 'text') text = block.text.trim();
    }

    // JSON 파싱 (```json 래핑 대응)
    let clean = text;
    if (clean.startsWith('```')) {
      clean = clean.split('\n', 2)[1] || clean;
      clean = clean.replace(/```\s*$/, '').trim();
    }

    const parsed = JSON.parse(clean);
    const axes = {
      hook_power: clamp(parsed.hook_power),
      emotional_pull: clamp(parsed.emotional_pull),
      saju_authenticity: clamp(parsed.saju_authenticity),
      scroll_stop: clamp(parsed.scroll_stop),
      natural_voice: clamp(parsed.natural_voice),
    };

    const totalScore = axes.hook_power + axes.emotional_pull + axes.saju_authenticity + axes.scroll_stop + axes.natural_voice;
    const passed = totalScore >= PASS_THRESHOLD;

    await logSafetyCheck(platform, accountId, 'similarity', passed ? 'pass' : 'fail', {
      check: 'quality_judge',
      totalScore,
      axes,
      feedback: parsed.feedback || '',
    });

    return {
      passed,
      totalScore,
      axes,
      feedback: parsed.feedback || '',
    };
  } catch (err) {
    // Judge 실패 시 통과 처리 (judge가 병목이 되면 안 됨)
    console.warn('[QUALITY_JUDGE] Failed, passing by default:', err);
    return {
      passed: true,
      totalScore: 0,
      axes: { hook_power: 0, emotional_pull: 0, saju_authenticity: 0, scroll_stop: 0, natural_voice: 0 },
      feedback: 'Judge unavailable',
    };
  }
}

function clamp(n: unknown): number {
  const num = Number(n) || 0;
  return Math.max(1, Math.min(10, Math.round(num)));
}
