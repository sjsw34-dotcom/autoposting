import { fal } from '@fal-ai/client';
import { put } from '@vercel/blob';
import type { Platform, ContentType } from '@/lib/db/posts';

export interface ImageGenerationResult {
  imageUrls: string[];   // Vercel Blob permanent URLs (1-2장)
  prompts: string[];     // 사용된 프롬프트 (디버깅용)
}

// 콘텐츠 타입별 시각적 테마
// 절대 금지: 나침반, 오행, 사주 도표, 점성술 상징, 동양 신비주의 소품
const VISUAL_THEMES: Record<ContentType, string[]> = {
  fortune: [
    'dreamy sunrise sky with soft clouds and golden light',
    'city night skyline with bokeh lights and purple gradient sky',
    'misty mountain landscape at dawn with warm orange tones',
    'ocean horizon at golden hour with gentle waves',
    'starry night sky over a quiet lake with reflections',
  ],
  insight: [
    'minimalist room with natural light streaming through window',
    'cozy cafe interior with warm lighting and wood textures',
    'soft morning light and shadows on a clean white wall',
    'rain on a window with blurred city lights behind',
    'sunlight filtering through tree leaves creating shadow patterns',
  ],
  kculture: [
    'aesthetic Korean street at night with neon signs and warm tones',
    'traditional hanok cafe with modern styling and soft lighting',
    'cherry blossom lined street in Seoul with pastel colors',
    'colorful Korean market alley with string lights',
    'rooftop view of Seoul cityscape at sunset',
  ],
  love: [
    'warm candlelight with soft bokeh and flower petals',
    'couple silhouette against a sunset sky',
    'pink and peach colored flowers with soft focus',
    'cozy warm-toned room with fairy lights',
    'two coffee cups on a table with morning light',
  ],
  wealth: [
    'modern city skyline at golden hour with glass buildings',
    'elegant desk setup with warm ambient lighting',
    'aerial view of a vibrant city at dusk',
    'luxury minimal interior with natural light',
    'morning coffee with a city view through large windows',
  ],
};

const STYLE_SUFFIX = 'aesthetic photography style, soft lighting, warm tones, cinematic mood, no text, no watermark, no symbols, no icons';

const IMAGE_SIZES: Record<Platform, string> = {
  x: 'landscape_16_9',
};

interface FalImageResult {
  images: { url: string }[];
}

/**
 * 포스트용 이미지 생성 (1~2장)
 */
export async function generatePostImages(
  contentType: ContentType,
  platform: Platform,
  imageCount: number = 1
): Promise<ImageGenerationResult> {
  fal.config({ credentials: process.env.FAL_KEY });

  const themes = VISUAL_THEMES[contentType];
  const imageUrls: string[] = [];
  const prompts: string[] = [];

  for (let i = 0; i < imageCount; i++) {
    // 매번 다른 테마 선택
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const prompt = `${theme}. ${STYLE_SUFFIX}`;
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
    console.log(`[IMAGE] Generated ${i + 1}/${imageCount} for ${platform}/${contentType} — ~$0.02`);

    // 2장 생성 시 500ms 간격
    if (i < imageCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { imageUrls, prompts };
}

/**
 * 이미지 개수 결정: 60% → 1장, 40% → 2장
 */
export function decideImageCount(): number {
  return Math.random() < 0.6 ? 1 : 2;
}
