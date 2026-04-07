import type { Platform } from '@/lib/db/posts';

const ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const;

export function getRandomElement(): string {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

const DAILY_ANGLES = [
  // 기존 (8)
  'how today\'s energy affects your productivity',
  'what to watch out for in conversations today',
  'the best time of day to make important decisions',
  'why you might feel restless (or calm) today',
  'how today\'s elemental clash affects relationships',
  'a specific action to align with today\'s energy',
  'what today\'s energy means for creative projects',
  'how to handle conflict with today\'s Five Element dynamics',
  // 확장 (8)
  'what today\'s energy means for financial decisions and spending',
  'the one thing to avoid saying today based on elemental tension',
  'why your body feels different today — the physical side of elemental shifts',
  'how today\'s energy affects your sleep quality tonight',
  'the best and worst meetings to have today based on element flow',
  'why today might feel like a turning point (or a total dead end)',
  'what today\'s branch interaction means for unexpected news or encounters',
  'how to use today\'s elemental energy if you\'re starting something new',
] as const;

export function getDailyFortunePrompt(platform: Platform): string {
  const element = getRandomElement();
  const angle = DAILY_ANGLES[Math.floor(Math.random() * DAILY_ANGLES.length)];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const base = `You're a real person who does daily Saju energy readings. Not a horoscope bot — you actually analyze the Five Elements for each day and share what you find. Today you noticed something about ${element} energy.

Date: ${today}
Focus: ${element} element
Angle: ${angle}

Your voice:
- You sound like you just checked the chart this morning and are sharing what stood out
- Be specific, not vague fortune cookie stuff
- Give ONE concrete actionable tip
- You sometimes admit when a day's chart is confusing or contradictory
- You DON'T use "embrace" or "navigate" or "harness"`;

  return `${base}

Write a tweet (max 280 characters). Just the tweet, nothing else.`;
}
