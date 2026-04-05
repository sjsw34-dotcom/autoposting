/**
 * Threads API Client
 * https://developers.facebook.com/docs/threads
 *
 * Flow: 1) Create media container → 2) Publish container
 * Token: Long-lived token (60일 유효, 30일마다 갱신)
 */

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

interface ThreadsPostResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Threads에 포스트 게시 (텍스트, 이미지 1장, 또는 캐러셀 2장)
 */
export async function postToThreads(
  text: string,
  options?: { linkUrl?: string; imageUrls?: string[] }
): Promise<ThreadsPostResult> {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    throw new Error('Missing THREADS_USER_ID or THREADS_ACCESS_TOKEN');
  }

  const imageUrls = options?.imageUrls;

  // 이미지 2장 → CAROUSEL
  if (imageUrls && imageUrls.length >= 2) {
    return postThreadsCarousel(userId, accessToken, text, imageUrls);
  }

  // 이미지 1장 → IMAGE type
  // 이미지 없음 → TEXT type
  const containerBody: Record<string, string> = {
    text,
    access_token: accessToken,
  };

  if (imageUrls && imageUrls.length === 1) {
    containerBody.media_type = 'IMAGE';
    containerBody.image_url = imageUrls[0];
  } else {
    containerBody.media_type = 'TEXT';
  }

  // Step 1: Create media container
  const containerResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  });

  if (!containerResponse.ok) {
    const error = await containerResponse.text();
    return {
      id: '',
      success: false,
      error: `Container creation failed (${containerResponse.status}): ${error}`,
    };
  }

  const container = await containerResponse.json() as { id: string };

  // Brief wait for container processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 2: Publish the container
  const publishResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: accessToken,
    }),
  });

  if (!publishResponse.ok) {
    const error = await publishResponse.text();
    return {
      id: container.id,
      success: false,
      error: `Publish failed (${publishResponse.status}): ${error}`,
    };
  }

  const published = await publishResponse.json() as { id: string };
  return { id: published.id, success: true };
}

/**
 * Threads Carousel (2장 이미지) ���시
 */
async function postThreadsCarousel(
  userId: string,
  accessToken: string,
  text: string,
  imageUrls: string[]
): Promise<ThreadsPostResult> {
  // Step 1: 자식 컨테이너 생성 (각 이미지)
  const childIds: string[] = [];
  for (const imageUrl of imageUrls.slice(0, 2)) {
    const childResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'IMAGE',
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: accessToken,
      }),
    });
    if (!childResponse.ok) {
      const error = await childResponse.text();
      return { id: '', success: false, error: `Carousel child failed: ${error}` };
    }
    const child = await childResponse.json() as { id: string };
    childIds.push(child.id);
  }

  // Step 2: 캐러셀 컨테이너 생성
  const carouselResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      text,
      access_token: accessToken,
    }),
  });

  if (!carouselResponse.ok) {
    const error = await carouselResponse.text();
    return { id: '', success: false, error: `Carousel creation failed: ${error}` };
  }

  const carousel = await carouselResponse.json() as { id: string };
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: 게시
  const publishResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: carousel.id,
      access_token: accessToken,
    }),
  });

  if (!publishResponse.ok) {
    const error = await publishResponse.text();
    return { id: carousel.id, success: false, error: `Carousel publish failed: ${error}` };
  }

  const published = await publishResponse.json() as { id: string };
  return { id: published.id, success: true };
}

/**
 * Long-lived Token 갱신 (유효기간 60일 연장)
 */
export async function refreshThreadsToken(): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const currentToken = process.env.THREADS_ACCESS_TOKEN;
  if (!currentToken) {
    throw new Error('Missing THREADS_ACCESS_TOKEN');
  }

  const response = await fetch(
    `${THREADS_API_BASE}/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`
  );

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * 현재 토큰 상태 확인
 */
export async function checkThreadsTokenStatus(): Promise<{
  valid: boolean;
  expiresAt?: Date;
}> {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!accessToken) {
    return { valid: false };
  }

  const response = await fetch(
    `${THREADS_API_BASE}/me?fields=id,username&access_token=${accessToken}`
  );

  return { valid: response.ok };
}
