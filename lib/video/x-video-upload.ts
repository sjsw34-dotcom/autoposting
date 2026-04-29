import fs from 'node:fs/promises';
import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';

interface XVideoPostResult {
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

function createClient(accountNumber: number = 1): TwitterApi {
  const c = getAccountCredentials(accountNumber);
  return new TwitterApi({
    appKey: c.appKey,
    appSecret: c.appSecret,
    accessToken: c.accessToken,
    accessSecret: c.accessSecret,
  });
}

/**
 * Post a tweet with an attached video. Uses the chunked v1.1 media upload
 * (twitter-api-v2 handles INIT/APPEND/FINALIZE/STATUS internally).
 *
 * Constraints (X limits):
 * - max 512MB
 * - max 2:20 duration
 * - mp4/mov, h264, aac
 * - max bitrate 25Mbps
 */
export async function postXVideo(
  text: string,
  videoPath: string,
  accountNumber: number = 1
): Promise<XVideoPostResult> {
  try {
    const client = createClient(accountNumber);

    const stat = await fs.stat(videoPath);
    if (stat.size > 512 * 1024 * 1024) {
      throw new Error(`Video exceeds X 512MB limit (${stat.size} bytes)`);
    }

    const mediaId = await client.v1.uploadMedia(videoPath, {
      mimeType: EUploadMimeType.Mp4,
      target: 'tweet',
    });

    const result = await client.readWrite.v2.tweet({
      text,
      media: { media_ids: [mediaId] },
    });

    return { id: result.data.id, success: true };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string; data?: { detail?: string } };
    return {
      id: '',
      success: false,
      error: err.data?.detail || err.message || 'Unknown error',
      errorCode: err.code || 0,
    };
  }
}
