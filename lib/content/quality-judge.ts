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
   10 = bold question/declaration that demands attention ("Yang Metal people don't ghost — they execute you from their life with surgical precision.")
   7 = strong start with specific angle
   5 = decent opening but not memorable
   1 = generic/boring start ("Today's energy is..." or "Let's talk about...")

2. EMOTIONAL_PULL: Does it create "this is about ME" feeling?
   10 = hits a specific emotional nerve, feels personal ("that moment when your Yin Fire DM partner says 'I'm fine' but their candle flame eyes say otherwise")
   7 = relatable scenario with element/star specificity
   5 = somewhat relatable but generic
   1 = informational only, no emotional connection

3. SAJU_AUTHENTICITY: Does it use REAL Korean astrology mechanics correctly?
   10 = uses correct terminology (Day Master, Ten Gods, 12 Stages, element cycles) with proper Korean terms AND shows understanding of mechanics ("Your 편재 Pyeonjae energy means money flows through your hands — you're a speculator, not a saver. That's not a flaw, that's your chart.")
   7 = references specific Saju concepts with correct mechanics
   5 = mentions Saju but could be any astrology; vague element references
   3 = uses Saju terms incorrectly or superficially
   1 = basically Western zodiac with "Saju" label; no Korean terms

4. SCROLL_STOP: Is it concise and punchy?
   10 = every word earns its place, strong ending, lands like a punchline
   7 = tight writing, no filler
   5 = decent but could be tighter
   1 = rambling, filler words, weak ending

5. NATURAL_VOICE: Does it sound like a real person?
   10 = has personality, opinions, slight imperfections, specific takes
   7 = clear voice with some edge
   5 = competent but could be anyone
   1 = clearly AI-generated, uses "delve/navigate/embrace/unlock"

Return ONLY a JSON object:
{
  "hook_power": <number>,
  "emotional_pull": <number>,
  "saju_authenticity": <number>,
  "scroll_stop": <number>,
  "natural_voice": <number>,
  "feedback": "<one sentence: what would make this post better>"
}`;

const PASS_THRESHOLD = 33; // 50점 만점 중 33점 이상 통과 (66%)
const SAJU_AUTH_MINIMUM = 6; // saju_authenticity 최소 6점 (핵심 차별화 축)

/** 콘텐츠 타입별 가중 축 — 해당 축이 5 미만이면 불통과 */
const CONTENT_TYPE_CRITICAL_AXIS: Partial<Record<ContentType, keyof QualityScore['axes']>> = {
  insight: 'saju_authenticity',
  love: 'emotional_pull',
  wealth: 'hook_power',
  fortune: 'saju_authenticity',
};

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

    // 통과 조건: 총점 + saju_authenticity 최소 + 콘텐츠 타입별 핵심 축
    const criticalAxis = CONTENT_TYPE_CRITICAL_AXIS[contentType];
    const criticalAxisPassed = criticalAxis ? axes[criticalAxis] >= 5 : true;
    const passed = totalScore >= PASS_THRESHOLD
      && axes.saju_authenticity >= SAJU_AUTH_MINIMUM
      && criticalAxisPassed;

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
