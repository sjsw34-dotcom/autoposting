import { sql } from './client';

export type Platform = 'threads' | 'x' | 'medium';
export type PostStatus = 'success' | 'failed' | 'skipped';
export type ContentType = 'fortune' | 'insight' | 'kculture' | 'love' | 'wealth';
export type Slot = 'morning' | 'lunch' | 'evening';
export type Brand = 'sajumuse' | 'amormuse';

export interface SocialPost {
  id: number;
  platform: Platform;
  account_id: string;
  posted_at: Date;
  slot: Slot;
  content_type: ContentType;
  content: string;
  content_hash: string;
  has_link: boolean;
  has_image: boolean;
  image_url: string | null;
  platform_post_id: string | null;
  status: PostStatus;
  error_message: string | null;
  brand: Brand;
  created_at: Date;
}

export async function insertPost(post: {
  platform: Platform;
  account_id: string;
  slot: Slot;
  content_type: ContentType;
  content: string;
  content_hash: string;
  has_link: boolean;
  has_image?: boolean;
  image_url?: string;
  brand: Brand;
  platform_post_id?: string;
  status?: PostStatus;
  error_message?: string;
}) {
  const result = await sql`
    INSERT INTO social_posts (
      platform, account_id, posted_at, slot, content_type,
      content, content_hash, has_link, has_image, image_url, brand, platform_post_id,
      status, error_message
    ) VALUES (
      ${post.platform}, ${post.account_id}, NOW(), ${post.slot}, ${post.content_type},
      ${post.content}, ${post.content_hash}, ${post.has_link},
      ${post.has_image ?? false}, ${post.image_url ?? null},
      ${post.brand},
      ${post.platform_post_id || null},
      ${post.status || 'success'}, ${post.error_message || null}
    )
    RETURNING *
  `;
  return result.rows[0] as SocialPost;
}

export async function getRecentPosts(
  platform: Platform,
  accountId: string,
  hours: number = 24
) {
  const result = await sql`
    SELECT * FROM social_posts
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND posted_at > NOW() - INTERVAL '1 hour' * ${hours}
      AND status = 'success'
    ORDER BY posted_at DESC
  `;
  return result.rows as SocialPost[];
}

export async function getRecentHashes(
  platform: Platform,
  accountId: string,
  limit: number = 50
) {
  const result = await sql`
    SELECT content_hash FROM social_posts
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND status = 'success'
    ORDER BY posted_at DESC
    LIMIT ${limit}
  `;
  return result.rows.map(r => r.content_hash as string);
}

export async function getCrossAccountHashes(
  platform: Platform,
  excludeAccountId: string,
  hours: number = 48
) {
  const result = await sql`
    SELECT content_hash, account_id FROM social_posts
    WHERE platform = ${platform}
      AND account_id != ${excludeAccountId}
      AND posted_at > NOW() - INTERVAL '1 hour' * ${hours}
      AND status = 'success'
    ORDER BY posted_at DESC
  `;
  return result.rows as { content_hash: string; account_id: string }[];
}

export async function getLastPost(platform: Platform, accountId: string) {
  const result = await sql`
    SELECT * FROM social_posts
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND status = 'success'
    ORDER BY posted_at DESC
    LIMIT 1
  `;
  return result.rows[0] as SocialPost | undefined;
}

export async function getLinkPostCount(
  platform: Platform,
  accountId: string,
  recentCount: number = 10
) {
  const result = await sql`
    SELECT COUNT(*) as link_count FROM (
      SELECT has_link FROM social_posts
      WHERE platform = ${platform}
        AND account_id = ${accountId}
        AND status = 'success'
      ORDER BY posted_at DESC
      LIMIT ${recentCount}
    ) sub
    WHERE has_link = TRUE
  `;
  return parseInt(result.rows[0].link_count as string, 10);
}

export async function getTodayPostCount(platform: Platform, accountId: string) {
  const result = await sql`
    SELECT COUNT(*) as count FROM social_posts
    WHERE platform = ${platform}
      AND account_id = ${accountId}
      AND posted_at > CURRENT_DATE
      AND status = 'success'
  `;
  return parseInt(result.rows[0].count as string, 10);
}

export async function getDailyReport() {
  const result = await sql`
    SELECT
      platform,
      account_id,
      COUNT(*) FILTER (WHERE status = 'success') as success_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      COUNT(*) FILTER (WHERE status = 'skipped') as skipped_count
    FROM social_posts
    WHERE posted_at > CURRENT_DATE
    GROUP BY platform, account_id
    ORDER BY platform, account_id
  `;
  return result.rows;
}
