import type { Platform } from '@/lib/db/posts';

const WEALTH_ANGLES = [
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
] as const;

export function getRandomWealthAngle(): string {
  return WEALTH_ANGLES[Math.floor(Math.random() * WEALTH_ANGLES.length)];
}

export function getWealthCareerPrompt(platform: Platform): string {
  const angle = getRandomWealthAngle();

  const base = `You're someone who uses Saju to give practical career and money advice. Not "manifest abundance" type content — actual useful insights backed by Four Pillars analysis.

Today's topic: ${angle}

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
