import Anthropic from '@anthropic-ai/sdk';
import { fal } from '@fal-ai/client';
import { put } from '@vercel/blob';
import type { Platform, ContentType } from '@/lib/db/posts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ImageGenerationResult {
  imageUrls: string[];
  prompts: string[];
}

const IMAGE_SIZES: Record<Platform, string> = {
  x: 'landscape_16_9',
};

interface FalImageResult {
  images: { url: string }[];
}

/**
 * 포스트 내용 기반 이미지 프롬프트 생성
 * Claude Haiku가 포스트 텍스트를 분석하여 FLUX Pro에 최적화된 프롬프트를 만든다.
 */
async function generateImagePrompt(postText: string, contentType: ContentType): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    temperature: 0.7,
    system: `You are an expert image prompt engineer for FLUX Pro (text-to-image AI).
Your job: read a social media post and craft ONE perfect image prompt that elevates the post when seen together on a feed.

=== IMAGE QUALITY PRINCIPLES ===

COMPOSITION:
- Always specify a clear subject and background relationship
- Use rule-of-thirds or centered composition — state which
- Specify depth of field: "shallow DoF with bokeh background" or "deep focus landscape"
- Include camera angle: "eye-level", "slightly above", "low angle looking up"
- For 16:9 format: leave breathing room, don't overcrowd the frame

LIGHTING (most important for mood):
- Golden hour: warm, directional, long shadows — for hope, warmth, new beginnings
- Blue hour: cool, contemplative, soft — for introspection, mystery
- Overcast diffused: even, soft, no harsh shadows — for calm, neutral
- Side lighting: dramatic, depth-revealing — for tension, duality
- Backlit/rim light: silhouette, ethereal — for transformation, spiritual
- Practical lighting (lamps, candles, neon): intimate, grounded — for personal moments
- Always specify light direction and quality (soft/hard/diffused)

COLOR PALETTE:
- Specify 2-3 dominant colors that match the emotional tone
- Warm amber + deep navy = contemplation with warmth
- Sage green + cream = growth, calm
- Deep burgundy + gold = passion, intensity
- Cool blue + silver = clarity, detachment
- Muted earth tones = grounded, practical
- Avoid oversaturated neon or garish combinations

STYLE DIRECTION:
- "Editorial photography" = polished, magazine-worthy
- "Documentary photography" = raw, authentic
- "Fine art photography" = artistic, intentional
- "Lifestyle photography" = natural, relatable
- Specify film stock feel if appropriate: "Kodak Portra 400 warmth", "Fuji Pro 400H greens"

=== ABSOLUTE RULES ===

NEVER include in prompts:
- Human faces or recognizable people (AI faces look uncanny and ruin posts)
- Hands or fingers (AI consistently fails at these)
- Text, letters, numbers, writing of any kind
- Logos, watermarks, brand marks
- Phone screens, laptop screens, any screen with content
- Mystical clichés: crystal balls, tarot cards, zodiac wheels, horoscope symbols
- Saju/Eastern: compass (나침반), bagua mirrors, yin-yang symbols, five element diagrams
  (Exception: ONLY if the post literally explains that specific concept, and even then, show it as a real physical object in a natural setting, not as a graphic)
- Multiple small objects scattered around (looks like stock photo)
- Clip art style, illustration style, cartoon style
- Split compositions or collages

ALWAYS include in prompts:
- One clear visual metaphor that connects to the post's core message
- Specific material textures (weathered wood, smooth stone, flowing silk, cracked earth)
- Environmental context (where is this scene?)
- Time of day and its light quality
- Atmospheric elements if relevant (mist, rain, dust particles in light, steam)

=== AUDIENCE ===
- 20s to 50s adults, international English speakers
- Sophisticated but not pretentious, warm but not cheesy
- Think: the kind of image a thoughtful person would pause on while scrolling
- NOT: overly young/trendy, NOT: stock-photo corporate, NOT: Instagram-filter-heavy

=== CONTENT TYPE MOODS ===
- fortune: expansive, atmospheric, nature or sky, sense of possibility
- insight: intimate, contemplative, personal spaces, interesting light
- kculture: authentic Korean aesthetics — hanok architecture, Korean ceramics, tea ceremony, seasonal Korean landscapes, traditional fabric textures. NOT: tourist shots, NOT: K-pop neon
- love: warmth, proximity, tenderness — through objects and spaces, NOT through people
- wealth: grounded ambition, craftsmanship, quality materials, urban architecture

=== OUTPUT FORMAT ===
Write exactly ONE prompt, 40-70 words. Be extremely specific. Every word should add visual information.
No preamble, no explanation, just the prompt.`,
    messages: [{
      role: 'user',
      content: `Post text: "${postText}"\nContent type: ${contentType}`,
    }],
  });

  let prompt = '';
  for (const block of message.content) {
    if (block.type === 'text') prompt = block.text.trim();
  }

  // 따옴표 래핑 제거
  if ((prompt.startsWith('"') && prompt.endsWith('"')) || (prompt.startsWith("'") && prompt.endsWith("'"))) {
    prompt = prompt.slice(1, -1).trim();
  }

  // "Here's" 등 메타 텍스트 제거
  prompt = prompt.replace(/^(here'?s?\s*(the|a|my|your)?\s*prompt[:\s]*)/i, '').trim();

  // 안전장치: 사람 얼굴/손 관련 단어가 포함되면 제거
  const faceHandPatterns = /\b(face|portrait|person|people|man|woman|girl|boy|child|hand|finger|selfie|headshot)\b/gi;
  prompt = prompt.replace(faceHandPatterns, '').replace(/\s{2,}/g, ' ').trim();

  return prompt;
}

/**
 * 포스트 내용 기반 이미지 생성
 */
export async function generatePostImages(
  contentType: ContentType,
  platform: Platform,
  imageCount: number = 1,
  postText?: string
): Promise<ImageGenerationResult> {
  fal.config({ credentials: process.env.FAL_KEY });

  const imageUrls: string[] = [];
  const prompts: string[] = [];

  for (let i = 0; i < imageCount; i++) {
    let prompt: string;

    if (postText) {
      // 포스트 내용 기반 프롬프트 생성
      prompt = await generateImagePrompt(postText, contentType);
    } else {
      // fallback: 기본 테마
      prompt = `Atmospheric ${contentType} themed photography, natural lighting, warm tones, cinematic mood. No text, no watermark, no symbols`;
    }
    prompts.push(prompt);

    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt,
        image_size: IMAGE_SIZES[platform] as 'landscape_16_9' | 'square_hd',
        num_images: 1,
        output_format: 'png',
        safety_tolerance: '5',
      },
    });

    const data = result.data as FalImageResult;
    const falUrl = data.images[0].url;

    // fal.ai 임시 URL → Vercel Blob 영구 저장
    const response = await fetch(falUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `social/${platform}/${contentType}/${Date.now()}_${i}.png`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
    });

    imageUrls.push(blob.url);
    console.log(`[IMAGE] Generated ${i + 1}/${imageCount} for ${platform}/${contentType}`);

    if (i < imageCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { imageUrls, prompts };
}

/**
 * 이미지 개수 결정: 70% → 1장, 30% → 2장
 */
export function decideImageCount(): number {
  return Math.random() < 0.7 ? 1 : 2;
}
