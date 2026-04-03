import type { ContentType, Slot } from '@/lib/db/posts';

/**
 * Threads 슬롯별 콘텐츠 타입 매핑
 * 아침: 일간 운세, 점심: K-Culture, 저녁: 사주 인사이트
 */
export function getThreadsContentType(slot: Slot): ContentType {
  switch (slot) {
    case 'morning': return 'fortune';
    case 'lunch': return 'kculture';
    case 'evening': return 'insight';
  }
}

/**
 * Threads 콘텐츠 후처리 — 길이 조정, 해시태그 정리
 */
export function formatThreadsContent(text: string): string {
  // 해시태그 1개 이하로 제한
  const hashtags = text.match(/#\w+/g) || [];
  if (hashtags.length > 1) {
    // 첫 번째만 유지, 나머지 제거
    let keepFirst = true;
    text = text.replace(/#\w+/g, (match) => {
      if (keepFirst) {
        keepFirst = false;
        return match;
      }
      return '';
    });
  }

  // 500자 초과 시 트리밍
  if (text.length > 500) {
    text = text.slice(0, 497) + '...';
  }

  return text.trim().replace(/\n{3,}/g, '\n\n');
}
