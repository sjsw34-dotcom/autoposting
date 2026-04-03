import { sql } from './client';
import type { Platform } from './posts';

export interface SocialToken {
  id: number;
  platform: Platform;
  account_id: string;
  token_type: string;
  token_value: string;
  expires_at: Date | null;
  refreshed_at: Date;
}

export async function getToken(
  platform: Platform,
  accountId: string,
  tokenType: string = 'access_token'
) {
  const result = await sql`
    SELECT * FROM social_tokens
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND token_type = ${tokenType}
  `;
  return result.rows[0] as SocialToken | undefined;
}

export async function upsertToken(
  platform: Platform,
  accountId: string,
  tokenType: string,
  tokenValue: string,
  expiresAt?: Date
) {
  const result = await sql`
    INSERT INTO social_tokens (platform, account_id, token_type, token_value, expires_at, refreshed_at)
    VALUES (${platform}, ${accountId}, ${tokenType}, ${tokenValue}, ${expiresAt?.toISOString() || null}, NOW())
    ON CONFLICT (platform, account_id, token_type)
    DO UPDATE SET
      token_value = EXCLUDED.token_value,
      expires_at = EXCLUDED.expires_at,
      refreshed_at = NOW()
    RETURNING *
  `;
  return result.rows[0] as SocialToken;
}

export async function getExpiringTokens(daysUntilExpiry: number = 7) {
  const result = await sql`
    SELECT * FROM social_tokens
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW() + INTERVAL '1 day' * ${daysUntilExpiry}
      AND expires_at > NOW()
  `;
  return result.rows as SocialToken[];
}
