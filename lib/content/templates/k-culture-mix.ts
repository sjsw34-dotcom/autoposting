import type { Platform } from '@/lib/db/posts';

const TOPICS = [
  // 기존 (12)
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
  // K-pop 구체적 (5)
  'aespa Karina as a textbook strong Day Master — her chart explains everything',
  'the element clash inside BTS that made them unstoppable',
  'BLACKPINK members have four completely different Day Masters — on purpose?',
  'why K-pop trainees born in Water years tend to debut faster',
  'the Saju reason some K-pop idols peak early and others are late bloomers',
  // K-drama / 영화 (3)
  'Korean revenge dramas are basically Metal Day Master origin stories',
  'the Saju reading of a typical K-drama villain — they always have this element clash',
  'why K-drama female leads keep falling for the "wrong" type (it\'s in the chart)',
  // 한국 일상 문화 (4)
  'Seoul cafe culture and the Five Element energy of different neighborhoods',
  'why Koreans check Saju before signing apartment leases (it\'s not superstition)',
  'Korean jjimjilbang culture is basically Five Element therapy and nobody talks about it',
  'the Saju logic behind Korean companies doing everything by hierarchy and seniority',
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

  return `${base}

Write a tweet (max 280 characters). Just the tweet, nothing else.`;
}
