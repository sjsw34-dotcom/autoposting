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
 * Threads에 텍스트 포스트 게시
 */
export async function postToThreads(
  text: string,
  options?: { linkUrl?: string }
): Promise<ThreadsPostResult> {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    throw new Error('Missing THREADS_USER_ID or THREADS_ACCESS_TOKEN');
  }

  // Step 1: Create media container
  const containerResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'TEXT',
      text,
      access_token: accessToken,
    }),
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
