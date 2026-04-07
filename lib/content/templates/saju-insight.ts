import type { Platform } from '@/lib/db/posts';

const SPECIFIC_TOPICS = [
  // 기존 (12)
  'the Day Master concept and what it reveals',
  'how the Four Pillars interact with each other',
  'what happens when Fire meets Metal in a chart',
  'why your birth hour changes everything',
  'the hidden meaning of your month pillar',
  'Earth element people and their overlooked strengths',
  'what most people get wrong about Water in Saju',
  'the difference between strong and weak Day Masters',
  'how seasonal energy affects your chart reading',
  'why two people born the same day can have different fortunes',
  'the clash between Wood and Metal and what it means for decisions',
  'Yin vs Yang energy in your Four Pillars',
  // 십성 (Ten Stars) 관련 (5)
  'what your Ten Stars say about how you handle power and control',
  'why the Wealth Star in your chart doesn\'t mean what TikTok thinks',
  'the Power Star (Gwanseong) — some people are just born to lead',
  'how Pyeongwan (偏官) energy shows up in people who break the rules',
  'the Jeongkwan (正官) star and why "following the rules" is actually your superpower',
  // 12운성 (12 Stages of Energy) 관련 (4)
  'why being in a "death stage" in Saju is actually a sign of transformation',
  'the difference between a "birth" year and a "peak" year in your chart',
  'how the 12 Stages of Energy explain why some years feel like you\'re running on empty',
  'what the "bath" stage means — and why it\'s not about relaxation',
  // 신살/Noble Stars (3)
  'the Peach Blossom star and why it makes you magnetic (and sometimes messy)',
  'Noble Stars in your chart — hidden protectors you didn\'t know you had',
  'the Traveling Horse star and why you can\'t sit still',
  // 용신 (Useful God) / 구조 분석 (3)
  'the one element your chart is desperate for — and how to feed it',
  'what "too much Fire" actually looks like in a person\'s behavior',
  'why a chart full of Water doesn\'t mean you\'re emotional — it\'s more complicated',
  // 지장간 (Hidden Stems) (2)
  'the secret personality hiding inside your Earthly Branch',
  'Hidden Stems — why your chart is deeper than the four columns you see',
  // 충/합 (Clashes and Harmonies) (3)
  'when your year and day pillar clash — the inner conflict you carry since birth',
  'the Three Harmony combination in your chart and why it feels like everything clicks',
  'Earthly Branch clashes — why certain months or years feel like your life is breaking apart',
] as const;

export function pickInsightTopic(): string {
  return SPECIFIC_TOPICS[Math.floor(Math.random() * SPECIFIC_TOPICS.length)];
}

export function getSajuInsightPrompt(platform: Platform, topic?: string): string {
  const selectedTopic = topic || pickInsightTopic();

  const base = `You are a real person who runs a Saju (Korean Four Pillars astrology) account. You studied Saju for years and genuinely love it. You're NOT an AI, NOT a brand, NOT a marketing account — just someone passionate about this topic sharing what you know.

Today's angle: ${selectedTopic}

Your voice:
- You talk like you're sharing something cool with a friend
- You have strong opinions and aren't afraid to disagree with mainstream astrology
- You reference specific details (actual element interactions, real chart examples)
- Sometimes you're surprised by what you find in charts
- You DON'T sound like a textbook or Wikipedia article`;

  return `${base}

Write a tweet (max 280 characters). Just the tweet text, nothing else.`;
}
