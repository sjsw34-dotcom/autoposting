import { TwitterApi } from 'twitter-api-v2';

/**
 * X (Twitter) API Client
 * 멀티계정 지원 구조 (현재 1계정, env 변수 추가로 확장 가능)
 *
 * Free tier: 월 1,500 tweets (쓰기), 읽기 제한 있음
 * OAuth 1.0a User Context 사용
 */

interface XPostResult {
  id: string;
  success: boolean;
  error?: string;
  errorCode?: number;
}

interface AccountCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
  username: string;
}

/**
 * 계정 번호로 인증 정보 로드
 */
function getAccountCredentials(accountNumber: number = 1): AccountCredentials {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env[`X_ACCOUNT_${accountNumber}_TOKEN`];
  const accessSecret = process.env[`X_ACCOUNT_${accountNumber}_SECRET`];
  const username = process.env[`X_ACCOUNT_${accountNumber}_USERNAME`];

  if (!appKey || !appSecret || !accessToken || !accessSecret || !username) {
    throw new Error(`Missing X credentials for account ${accountNumber}`);
  }

  return { appKey, appSecret, accessToken, accessSecret, username };
}

/**
 * twitter-api-v2 클라이언트 생성
 */
function createClient(accountNumber: number = 1): TwitterApi {
  const creds = getAccountCredentials(accountNumber);
  return new TwitterApi({
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

/**
 * X에 트윗 게시 (이미지 첨부 가능, 최대 2장)
 */
export async function postToX(
  text: string,
  accountNumber: number = 1,
  imageBuffers?: Buffer[]
): Promise<XPostResult> {
  try {
    const client = createClient(accountNumber);
    const rwClient = client.readWrite;

    // 이미지가 있으면 미디어 업로드 후 첨부
    if (imageBuffers && imageBuffers.length > 0) {
      const mediaIds: string[] = [];
      for (const buffer of imageBuffers) {
        const mediaId = await client.v1.uploadMedia(buffer, { mimeType: 'image/png' });
        mediaIds.push(mediaId);
      }
      const tweetMediaIds = mediaIds.length === 1
        ? [mediaIds[0]] as [string]
        : [mediaIds[0], mediaIds[1]] as [string, string];
      const result = await rwClient.v2.tweet({
        text,
        media: { media_ids: tweetMediaIds },
      });
      return { id: result.data.id, success: true };
    }

    const result = await rwClient.v2.tweet(text);

    return {
      id: result.data.id,
      success: true,
    };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string; data?: { detail?: string } };
    const errorCode = err.code || 0;
    const errorMessage = err.data?.detail || err.message || 'Unknown error';

    return {
      id: '',
      success: false,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * 활성 X 계정 목록 반환
 */
export function getActiveXAccounts(): { accountNumber: number; username: string }[] {
  const accounts: { accountNumber: number; username: string }[] = [];

  for (let i = 1; i <= 5; i++) {
    const username = process.env[`X_ACCOUNT_${i}_USERNAME`];
    const token = process.env[`X_ACCOUNT_${i}_TOKEN`];
    if (username && token) {
      accounts.push({ accountNumber: i, username });
    }
  }

  return accounts;
}

/**
 * X 계정 인증 상태 확인
 */
export async function verifyXAccount(accountNumber: number = 1): Promise<{
  valid: boolean;
  username?: string;
}> {
  try {
    const client = createClient(accountNumber);
    const me = await client.v2.me();
    return { valid: true, username: me.data.username };
  } catch {
    return { valid: false };
  }
}
