import type { ContentType, Slot } from '@/lib/db/posts';

// X 1계정: 슬롯별 콘텐츠 타입 로테이션
// 아침/점심/저녁에 다른 타입
const SLOT_ROTATION: Record<Slot, ContentType[]> = {
  morning: ['insight', 'fortune', 'kculture', 'wealth', 'love'],
  lunch: ['fortune', 'kculture', 'love', 'insight', 'wealth'],
  evening: ['kculture', 'love', 'wealth', 'fortune', 'insight'],
};

/**
 * X 슬롯별 콘텐츠 타입 — 요일 기반 로테이션
 */
export function getXContentType(slot: Slot): ContentType {
  const dayOfWeek = new Date().getDay(); // 0-6
  const rotation = SLOT_ROTATION[slot];
  return rotation[dayOfWeek % rotation.length];
}

/**
 * X 콘텐츠 후처리 — 280자 제한, 해시태그 정리
 */
export function formatXContent(text: string): string {
  // 해시태그 3개 이하로 제한
  const hashtags = text.match(/#\w+/g) || [];
  if (hashtags.length > 3) {
    let count = 0;
    text = text.replace(/#\w+/g, (match) => {
      count++;
      return count <= 3 ? match : '';
    });
  }

  // 280자 초과 시 트리밍
  if (text.length > 280) {
    // 마지막 문장 경계에서 자르기 시도
    const truncated = text.slice(0, 277);
    const lastSentence = truncated.lastIndexOf('. ');
    if (lastSentence > 200) {
      text = truncated.slice(0, lastSentence + 1);
    } else {
      text = truncated + '...';
    }
  }

  return text.trim();
}
