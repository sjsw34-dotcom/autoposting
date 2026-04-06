import type { Platform } from '@/lib/db/posts';

const LOVE_ANGLES = [
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
