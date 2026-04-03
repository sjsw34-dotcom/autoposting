import type { Platform } from '@/lib/db/posts';

const TOPICS = [
  'that one K-drama character who is textbook Fire Day Master energy',
  'why so many K-pop groups have members with clashing elements',
  'the Saju reason Chuseok traditions involve specific foods',
  'how Korean parents used to name babies based on missing elements',
  'the Five Element logic behind hanbok color combinations',
  'why Korean BBQ is accidentally the most balanced Five Element meal',
  'that viral K-drama love triangle explained through Saju compatibility',
  'how Korean age calculation connects to Saju year pillar thinking',
  'the elemental energy shift Korea goes through every Lunar New Year',
  'why Korean skincare routines accidentally follow Water element principles',
  'the Saju patterns in K-pop debut timing that labels probably don\'t know about',
  'how Korean drinking culture reflects Fire and Water element dynamics',
] as const;

export function getRandomKCultureTopic(): string {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

export function getKCultureMixPrompt(platform: Platform): string {
  const topic = getRandomKCultureTopic();

  const base = `You're someone who's obsessed with both Korean culture and Saju, and you love finding unexpected connections between them. You just noticed something interesting and want to share it.

Today's find: ${topic}

Your voice:
- You sound genuinely excited about the connection you found
- You explain Korean cultural context for non-Korean readers naturally (not in a "let me explain" way)
- You're opinionated — "I think this is the real reason why..."
- You sometimes go on fun tangents
- You DON'T sound like a cultural ambassador or tourism board`;

  if (platform === 'threads') {
    return `${base}

Write a Threads post (100-500 characters). Just the post, nothing else.`;
  }

  if (platform === 'x') {
    return `${base}

Write a tweet (max 280 characters). Just the tweet, nothing else.`;
  }

  return `${base}

Write a Medium article (1000-2000 words) with markdown headings. Just the article, nothing else.`;
}
