import Anthropic from '@anthropic-ai/sdk';
import type { Platform, ContentType, Brand } from '@/lib/db/posts';
import { getSajuInsightPrompt } from './templates/saju-insight';
import { getDailyFortunePrompt } from './templates/daily-fortune';
import { getKCultureMixPrompt } from './templates/k-culture-mix';
import { getLoveDestinyPrompt } from './templates/love-destiny';
import { getWealthCareerPrompt } from './templates/wealth-career';
import {
  getWritingMood,
  getContentLengthMood,
  getEmojiBehavior,
  getHashtagBehavior,
  getImperfectionInstruction,
  getPostFormat,
  getRecentPostContext,
} from '@/lib/safety/human-behavior';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT_MAP: Record<ContentType, (platform: Platform) => string> = {
  insight: getSajuInsightPrompt,
  fortune: getDailyFortunePrompt,
  kculture: getKCultureMixPrompt,
  love: getLoveDestinyPrompt,
  wealth: getWealthCareerPrompt,
};

const BRAND_LINKS: Record<Brand, { main: string; cta: string }> = {
  sajumuse: {
    main: 'https://www.amormuse.com',
    cta: 'https://www.amormuse.com/chat',
  },
  amormuse: {
    main: 'https://www.amormuse.com',
    cta: 'https://www.amormuse.com/chat',
  },
};

const CONTENT_BRAND_MAP: Record<ContentType, Brand> = {
  insight: 'sajumuse',
  fortune: 'sajumuse',
  kculture: 'sajumuse',
  love: 'amormuse',
  wealth: 'sajumuse',
};

export interface GeneratedContent {
  text: string;
  contentType: ContentType;
  brand: Brand;
  hasLink: boolean;
  linkUrl?: string;
}

/**
 * AI 탐지 회피를 위한 핵심 시스템 프롬프트
 * 모든 플랫폼 프롬프트 앞에 붙음
 */
function getAntiDetectionPrompt(): string {
  return `CRITICAL RULES — You are a REAL HUMAN writing social media posts. Not an AI assistant.

NEVER DO THESE (instant AI detection):
- Never start with "I" as the first word
- Never use: "delve", "tapestry", "landscape", "Moreover", "Furthermore", "In conclusion", "It's important to note", "In today's world", "Let's dive in", "without further ado", "game-changer", "unlock", "elevate", "leverage", "navigate", "embrace", "foster", "holistic", "synergy", "paradigm"
- Never use three parallel structures in a row (AI loves triads)
- Never put the most important point last with a buildup (AI pattern)
- Never use a colon followed by a list in short posts
- Never write "Here's the thing:" or "Here's why:" (very AI)
- Never start consecutive sentences with the same word
- Never use overly smooth transitions between ideas
- Never be relentlessly positive — real humans are sometimes blunt, skeptical, or sarcastic

DO THESE (human signals):
- Vary sentence length wildly (3 words. Then maybe a longer one that meanders a bit.)
- Use fragments. Incomplete thoughts. Mid-thought pivots.
- Have opinions — take sides, not "on one hand, on the other hand"
- Reference specific, concrete things (not abstract platitudes)
- Sometimes start mid-thought as if continuing a conversation
- Be slightly messy — real posts aren't perfectly polished
- Occasionally use dashes, parentheses (like this), or ellipsis...
- Sound like you're texting a smart friend, not writing an essay`;
}

/**
 * Claude API로 콘텐츠 생성 — 인간 행동 시뮬레이션 적용
 */
export async function generateContent(
  platform: Platform,
  contentType: ContentType,
  options?: {
    brand?: Brand;
    includeLink?: boolean;
    linkStyle?: string;
    accountId?: string;
  }
): Promise<GeneratedContent> {
  const getPrompt = PROMPT_MAP[contentType];
  if (!getPrompt) {
    throw new Error(`Unknown content type: ${contentType}`);
  }

  const accountId = options?.accountId || 'default';
  const brand = options?.brand || CONTENT_BRAND_MAP[contentType];
  const shouldIncludeLink = options?.includeLink ?? false;

  // === 인간 행동 변수 수집 ===
  const writingMood = getWritingMood(accountId);
  const lengthMood = getContentLengthMood(platform);
  const emojiBehavior = getEmojiBehavior();
  const hashtagBehavior = getHashtagBehavior(platform);
  const imperfection = getImperfectionInstruction();
  const postFormat = getPostFormat();
  const recentContext = await getRecentPostContext(platform, accountId);

  // === 시스템 프롬프트 조합 ===
  const basePrompt = getPrompt(platform);
  const humanizedSystem = `${getAntiDetectionPrompt()}

${basePrompt}

TODAY'S WRITING STYLE:
- Mood: ${writingMood.mood} — ${writingMood.instruction}
- Length: ${lengthMood.modifier}
- Emoji: ${emojiBehavior.instruction}
- Hashtags: ${hashtagBehavior.includeHashtags ? `Include up to ${hashtagBehavior.maxCount} hashtag(s)` : 'NO hashtags today'}
- Format: ${postFormat}
${imperfection ? `- Imperfection: ${imperfection}` : ''}
${recentContext}
${shouldIncludeLink && options?.linkStyle ? `\nLink style: ${options.linkStyle}` : ''}`;

  // === 유저 메시지도 매번 다르게 (패턴 방지) ===
  const userMessages = [
    `Write one ${platform} post. Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
    `${platform} post time. ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}. Make it good.`,
    `New ${platform} post for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Just the post text, nothing else.`,
    `Create a ${platform} post. Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. Output only the post.`,
    `Time to post on ${platform}. ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} vibes. Just give me the text.`,
  ];
  const userMessage = userMessages[Math.floor(Math.random() * userMessages.length)];

  // === Temperature도 변동 (0.7~1.0) ===
  const temperature = 0.7 + Math.random() * 0.3;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: platform === 'medium' ? 4096 : 512,
    temperature,
    system: humanizedSystem,
    messages: [{ role: 'user', content: userMessage }],
  });

  let text = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      text = block.text.trim();
    }
  }

  // 따옴표로 감싼 경우 제거 (AI가 종종 하는 짓)
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }

  // "Here's your post:" 같은 메타 텍스트 제거
  text = text.replace(/^(here'?s?\s*(your|the|a)\s*(post|tweet|thread)[:\s]*)/i, '').trim();

  // 링크 추가 (요청된 경우)
  let hasLink = false;
  let linkUrl: string | undefined;
  if (shouldIncludeLink && platform !== 'medium') {
    const links = BRAND_LINKS[brand];
    linkUrl = links.cta;
    text = appendLink(text, linkUrl, platform);
    hasLink = true;
  }

  return { text, contentType, brand, hasLink, linkUrl };
}

function appendLink(text: string, url: string, platform: Platform): string {
  if (platform === 'x') {
    const maxTextLength = 280 - url.length - 2;
    const trimmedText = text.length > maxTextLength ? text.slice(0, maxTextLength - 3) + '...' : text;
    return `${trimmedText}\n${url}`;
  }
  if (platform === 'threads') {
    return `${text}\n\n${url}`;
  }
  return text;
}

export function insertMediumCTAs(
  content: string,
  sajumuseUrl: string = 'https://www.amormuse.com/chat',
  amormuseUrl: string = 'https://www.amormuse.com/chat'
): string {
  const lines = content.split('\n');
  const totalLines = lines.length;

  // CTA 위치도 약간 랜덤하게 (30-40%, 60-70%)
  const jitter1 = 0.30 + Math.random() * 0.10;
  const jitter2 = 0.60 + Math.random() * 0.10;

  const insertPoints = [
    Math.floor(totalLines * jitter1),
    Math.floor(totalLines * jitter2),
  ];

  // CTA 문구도 변동
  const ctaVariants1 = [
    `\n> Curious about your own chart? [Get a free reading](${sajumuseUrl})\n`,
    `\n> Want to know your Day Master? [Try a free Saju reading](${sajumuseUrl})\n`,
    `\n> Your birth chart holds the answers — [check yours free](${sajumuseUrl})\n`,
  ];
  const ctaVariants2 = [
    `\n> Wondering about love compatibility? [See what the stars say](${amormuseUrl})\n`,
    `\n> Curious about your relationship energy? [Explore here](${amormuseUrl})\n`,
    `\n> Love questions? [Saju has answers](${amormuseUrl})\n`,
  ];

  const cta1 = ctaVariants1[Math.floor(Math.random() * ctaVariants1.length)];
  const cta2 = ctaVariants2[Math.floor(Math.random() * ctaVariants2.length)];

  let offset = 0;
  lines.splice(insertPoints[0] + offset, 0, cta1);
  offset++;
  lines.splice(insertPoints[1] + offset, 0, cta2);

  // 마지막 CTA도 변동
  const closingCTAs = [
    `\n---\n\nReady to decode your destiny? Start with a [free Saju reading](${sajumuseUrl}) — just your birth date and time.\n`,
    `\n---\n\nYour Four Pillars are waiting. [Get your free reading](${sajumuseUrl}) and see what they reveal.\n`,
    `\n---\n\n[Free Saju reading](${sajumuseUrl}) — takes 2 minutes, might change how you see everything.\n`,
  ];
  lines.push(closingCTAs[Math.floor(Math.random() * closingCTAs.length)]);

  return lines.join('\n');
}

export function getDefaultBrand(contentType: ContentType): Brand {
  return CONTENT_BRAND_MAP[contentType];
}
