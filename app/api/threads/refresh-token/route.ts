import { NextResponse } from 'next/server';
import { refreshThreadsToken } from '@/lib/platforms/threads-client';
import { upsertToken } from '@/lib/db/tokens';
import { sendTelegram } from '@/lib/notify/telegram';
import { verifyCronSecret } from '@/lib/utils';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountId = process.env.THREADS_USER_ID || 'sajumuse';

  try {
    const result = await refreshThreadsToken();

    // DB에 새 토큰 저장
    const expiresAt = new Date(Date.now() + result.expiresIn * 1000);
    await upsertToken('threads', accountId, 'access_token', result.accessToken, expiresAt);

    await sendTelegram({
      text: `<b>Threads Token Refreshed</b> ✅\nExpires: ${expiresAt.toISOString().slice(0, 10)}\n\n⚠️ Update THREADS_ACCESS_TOKEN in Vercel env vars!`,
      level: 'info',
    });

    return NextResponse.json({
      status: 'success',
      expiresAt: expiresAt.toISOString(),
      note: 'Remember to update THREADS_ACCESS_TOKEN in Vercel environment variables',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await sendTelegram({
      text: `<b>Threads Token Refresh FAILED</b> ❌\n${message}\n\nManual renewal required!`,
      level: 'critical',
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
