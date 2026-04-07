import type { Platform } from '@/lib/db/posts';

const WEALTH_ANGLES = [
  // 기존 (12)
  'why some Day Masters are naturally better at saving money',
  'the element type most likely to burn out in corporate jobs',
  'what your Saju says about your negotiation style at work',
  'why Fire element people make impulsive purchases and how to redirect that energy',
  'the chart pattern that shows entrepreneurial potential',
  'Metal Day Master people and their complicated relationship with money',
  'why timing your career move matters more than your resume according to Saju',
  'the specific element clash that causes workplace conflict',
  'Water element careers — why the obvious choices aren\'t always right',
  'what your wealth star actually means (it\'s not what TikTok says)',
  'the Wood element approach to side hustles that actually works',
  'why Earth element people undercharge for their work',
  // 십성 기반 재물/관성 (4)
  'the Wealth Star (Jaeseseong) position in your chart and what it says about how money comes to you',
  'Power Star people in management — why they\'re effective but exhausting to work for',
  'the Food God star (Sikshin) and why creative people with it always find a way to get paid',
  'Pyeonjae (偏財) vs Jeongjae (正財) — are you a steady earner or a big-swing gambler',
  // 10년 대운 / 타이밍 (3)
  'how your 10-year fortune cycle affects when to ask for a raise vs when to stay quiet',
  'the Saju years where career changes actually stick — and the years where they backfire',
  'why some people\'s wealth peaks at 30 and others at 50 — it\'s not random',
  // 현대 직업/실용 (3)
  'AI careers and Saju — which Day Masters naturally thrive in tech and which ones struggle',
  'remote work vs office energy — what your chart says about where you do your best work',
  'investing style by Day Master — why some of you should never touch crypto',
] as const;

export function getRandomWealthAngle(): string {
  return WEALTH_ANGLES[Math.floor(Math.random() * WEALTH_ANGLES.length)];
}

export function pickWealthAngle(): string {
  return getRandomWealthAngle();
}

export function getWealthCareerPrompt(platform: Platform, angle?: string): string {
  const selectedAngle = angle || getRandomWealthAngle();

  const base = `You're someone who uses Saju to give practical career and money advice. Not "manifest abundance" type content — actual useful insights backed by Four Pillars analysis.

Today's topic: ${selectedAngle}

Your voice:
- You sound like a career coach who also knows Saju
- Practical and grounded, no woo-woo energy
- You give advice people can actually use tomorrow
- You're sometimes blunt about hard truths
- You reference real career situations (job switches, salary negotiation, burnout)
- You DON'T promise "wealth will flow to you" or any such nonsense
- You DON'T use "unlock your potential" or "leverage your strengths"`;

  return `${base}

Write a tweet (max 280 characters). Just the tweet, nothing else.`;
}
