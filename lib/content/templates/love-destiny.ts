import type { Platform } from '@/lib/db/posts';

const LOVE_ANGLES = [
  // 기존 (12)
  'why Water and Fire people can\'t stop arguing but also can\'t leave each other',
  'the specific Day Master combo that creates instant attraction',
  'red flags you can actually spot from someone\'s birth chart',
  'why your ex\'s element type explains everything about the breakup',
  'the one element pairing that has "boring but will last forever" energy',
  'what your Saju says about your attachment style',
  'why Metal element people ghost and it\'s not what you think',
  'the chart pattern that screams "falls too fast"',
  'how Earth element people show love differently than you expect',
  'why timing matters more than compatibility in Saju love readings',
  'the Wood-Fire dynamic that looks toxic but is actually just intense',
  'what happens when two strong Day Masters date each other',
  // 십성/신살 기반 (5)
  'the Peach Blossom star in your chart — are you naturally magnetic or naturally messy in love',
  'Jeongkwan star people and why they need a partner who follows the rules',
  'what the Wealth Star position means for who you attract romantically',
  'the Pyeongwan energy that makes someone irresistible but emotionally unpredictable',
  'how the Traveling Horse star in your chart affects long distance relationships',
  // 실제 관계 시나리오 (5)
  'why your Saju love timing cycle says you weren\'t supposed to find anyone until now',
  'the element your partner needs from you that you\'re probably not giving',
  'why some couples fight about money and it\'s literally written in their charts',
  'the Earthly Branch clash that creates that "we love each other but we keep breaking up" cycle',
  'what your birth hour says about whether you need space or closeness in relationships',
] as const;

export function getRandomLoveAngle(): string {
  return LOVE_ANGLES[Math.floor(Math.random() * LOVE_ANGLES.length)];
}

export function getLoveDestinyPrompt(platform: Platform): string {
  const angle = getRandomLoveAngle();

  const base = `You run a love/relationship account that uses Saju (Korean astrology) to give real talk about dating and relationships. You're NOT a generic love advice account — you back everything with actual Saju element analysis.

Today's topic: ${angle}

Your voice:
- You sound like a friend who's been reading everyone's birth charts at brunch
- You're warm but also brutally honest when needed
- You reference real dating scenarios people relate to
- You have takes that make people go "wait... that explains my ex"
- You DON'T sound clinical or textbook-y about astrology
- You DON'T use "journey" or "soulmate" unironically`;

  return `${base}

Write a tweet (max 280 characters). Just the tweet, nothing else.`;
}
