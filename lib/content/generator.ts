import Anthropic from '@anthropic-ai/sdk';
import type { Platform, ContentType, Brand } from '@/lib/db/posts';
import { getSajuInsightPrompt, pickInsightTopic } from './templates/saju-insight';
import { getDailyFortunePrompt, pickFortuneElement, pickFortuneAngle } from './templates/daily-fortune';
import { getKCultureMixPrompt, pickKCultureTopic } from './templates/k-culture-mix';
import { getLoveDestinyPrompt, pickLoveAngle } from './templates/love-destiny';
import { getWealthCareerPrompt, pickWealthAngle } from './templates/wealth-career';
import { getKnowledgeForTopic } from './saju-knowledge';
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

/** 토픽을 먼저 선택한 뒤 프롬프트 + 지식 매칭에 동시 사용 */
function pickTopicAndBuildPrompt(
  contentType: ContentType,
  platform: Platform
): { prompt: string; topic: string; element?: string } {
  switch (contentType) {
    case 'insight': {
      const topic = pickInsightTopic();
      return { prompt: getSajuInsightPrompt(platform, topic), topic };
    }
    case 'fortune': {
      const element = pickFortuneElement();
      const angle = pickFortuneAngle();
      return { prompt: getDailyFortunePrompt(platform, element, angle), topic: angle, element };
    }
    case 'kculture': {
      const topic = pickKCultureTopic();
      return { prompt: getKCultureMixPrompt(platform, topic), topic };
    }
    case 'love': {
      const topic = pickLoveAngle();
      return { prompt: getLoveDestinyPrompt(platform, topic), topic };
    }
    case 'wealth': {
      const topic = pickWealthAngle();
      return { prompt: getWealthCareerPrompt(platform, topic), topic };
    }
    default: {
      const topic = pickInsightTopic();
      return { prompt: getSajuInsightPrompt(platform, topic), topic };
    }
  }
}

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
    linkUrl?: string;
    linkStyle?: string;
    accountId?: string;
  }
): Promise<GeneratedContent> {
  const accountId = options?.accountId || 'default';
  const brand = options?.brand || CONTENT_BRAND_MAP[contentType];
  const shouldIncludeLink = options?.includeLink ?? false;

  // === 토픽 선택 + 프롬프트 생성 + 지식 매칭 ===
  const { prompt: basePrompt, topic, element } = pickTopicAndBuildPrompt(contentType, platform);
  const knowledge = getKnowledgeForTopic(contentType, topic, element);

  // === 인간 행동 변수 수집 ===
  const writingMood = getWritingMood(accountId);
  const lengthMood = getContentLengthMood(platform);
  const emojiBehavior = getEmojiBehavior();
  const hashtagBehavior = getHashtagBehavior(platform);
  const imperfection = getImperfectionInstruction();
  const postFormat = getPostFormat();
  const recentContext = await getRecentPostContext(platform, accountId);

  // === 시스템 프롬프트 조합 ===
  const humanizedSystem = `${getAntiDetectionPrompt()}

${basePrompt}

SAJU REFERENCE (use specific details, Korean terms, and real mechanics from this — don't invent generic astrology):
${knowledge}

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
    max_tokens: 512,
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

  // 링크 추가 (요청된 경우, human-behavior가 URL 결정)
  let hasLink = false;
  let linkUrl: string | undefined;
  if (shouldIncludeLink) {
    linkUrl = options?.linkUrl || BRAND_LINKS[brand].cta;
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
  return text;
}

export function getDefaultBrand(contentType: ContentType): Brand {
  return CONTENT_BRAND_MAP[contentType];
}
