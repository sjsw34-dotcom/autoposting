/**
 * Medium API Client
 * https://github.com/Medium/medium-api-docs
 *
 * Integration Token 기반 (만료 없음)
 * Rate limit: 제한 관대하지만 주 2-3회로 유지
 */

const MEDIUM_API_BASE = 'https://api.medium.com/v1';

interface MediumPostResult {
  id: string;
  url: string;
  success: boolean;
  error?: string;
}

interface MediumPublishOptions {
  title: string;
  content: string;  // Markdown 형식
  tags?: string[];
  canonicalUrl?: string;
  publishStatus?: 'public' | 'draft' | 'unlisted';
}

/**
 * Medium 사용자 정보 가져오기 (author ID 확인용)
 */
export async function getMediumUser(): Promise<{ id: string; username: string } | null> {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN;
  if (!token) return null;

  const response = await fetch(`${MEDIUM_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;

  const data = await response.json() as { data: { id: string; username: string } };
  return data.data;
}

/**
 * Medium에 글 발행
 */
export async function postToMedium(options: MediumPublishOptions): Promise<MediumPostResult> {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN;
  const authorId = process.env.MEDIUM_AUTHOR_ID;

  if (!token || !authorId) {
    throw new Error('Missing MEDIUM_INTEGRATION_TOKEN or MEDIUM_AUTHOR_ID');
  }

  const response = await fetch(`${MEDIUM_API_BASE}/users/${authorId}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: options.title,
      contentFormat: 'markdown',
      content: `# ${options.title}\n\n${options.content}`,
      tags: options.tags?.slice(0, 5) || [],
      canonicalUrl: options.canonicalUrl,
      publishStatus: options.publishStatus || 'public',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      id: '',
      url: '',
      success: false,
      error: `Medium publish failed (${response.status}): ${error}`,
    };
  }

  const data = await response.json() as {
    data: { id: string; url: string };
  };

  return {
    id: data.data.id,
    url: data.data.url,
    success: true,
  };
}
