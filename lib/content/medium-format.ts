import type { ContentType } from '@/lib/db/posts';

// Medium: 주 3회 (월수금) 콘텐츠 타입
const DAY_CONTENT: Record<number, ContentType> = {
  1: 'insight',   // 월: 심층 사주 분석
  3: 'kculture',  // 수: K-Culture 크로스
  5: 'fortune',   // 금: 계절/시기별 가이드
};

/**
 * Medium 오늘의 콘텐츠 타입 (월/수/금만 포스팅)
 */
export function getMediumContentType(): ContentType | null {
  const dayOfWeek = new Date().getDay();
  return DAY_CONTENT[dayOfWeek] || null;
}

/**
 * Medium 콘텐츠에서 제목과 본문 분리
 */
export function parseMediumContent(text: string): { title: string; content: string; tags: string[] } {
  let title = '';
  let content = text;

  // "# Title" 형식에서 제목 추출
  const h1Match = text.match(/^#\s+(.+)/m);
  if (h1Match) {
    title = h1Match[1].trim();
    content = text.replace(/^#\s+.+\n*/m, '').trim();
  } else {
    // 첫 줄을 제목으로 사용
    const lines = text.split('\n');
    title = lines[0].replace(/^[#*]+\s*/, '').trim();
    content = lines.slice(1).join('\n').trim();
  }

  // 태그 자동 생성 (최대 5개)
  const tags = generateTags(content);

  return { title, content, tags };
}

/**
 * 콘텐츠 기반 Medium 태그 생성
 */
function generateTags(content: string): string[] {
  const baseTags = ['Saju', 'Korean-Astrology'];
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('five element') || lowerContent.includes('wood') || lowerContent.includes('fire')) {
    baseTags.push('Five-Elements');
  }
  if (lowerContent.includes('love') || lowerContent.includes('compatibility') || lowerContent.includes('relationship')) {
    baseTags.push('Love-Compatibility');
  }
  if (lowerContent.includes('career') || lowerContent.includes('wealth') || lowerContent.includes('money')) {
    baseTags.push('Career-Astrology');
  }
  if (lowerContent.includes('k-drama') || lowerContent.includes('k-pop') || lowerContent.includes('korean culture')) {
    baseTags.push('Korean-Culture');
  }
  if (lowerContent.includes('fortune') || lowerContent.includes('horoscope') || lowerContent.includes('daily')) {
    baseTags.push('Daily-Fortune');
  }

  return baseTags.slice(0, 5);
}

/**
 * Medium에 게시할 canonical URL 생성
 */
export function getCanonicalUrl(slug: string): string {
  return `https://www.sajumuse.com/blog/${slug}`;
}
