import { NextResponse } from 'next/server';
import { getDailyReport } from '@/lib/db/posts';
import { getExpiringTokens } from '@/lib/db/tokens';
import { getActiveAccounts } from '@/lib/db/safety-log';
import { sendDailyReport, sendTelegram } from '@/lib/notify/telegram';
import { verifyCronSecret } from '@/lib/utils';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 일일 리포트 생성 및 전송
    const report = await getDailyReport();
    if (report.length > 0) {
      await sendDailyReport(report as {
        platform: string;
        account_id: string;
        success_count: string;
        failed_count: string;
        skipped_count: string;
      }[]);
    } else {
      await sendTelegram({
        text: '📊 <b>Daily Report</b>\nNo posts today.',
        level: 'info',
      });
    }

    // 2. 만료 임박 토큰 경고
    const expiringTokens = await getExpiringTokens(7);
    for (const token of expiringTokens) {
      await sendTelegram({
        text: `<b>Token Expiring Soon</b>\n${token.platform} @${token.account_id}\nExpires: ${token.expires_at ? new Date(token.expires_at).toISOString().slice(0, 10) : 'unknown'}`,
        level: 'warn',
      });
    }

    // 3. 활성 계정 상태
    const activeAccounts = await getActiveAccounts();

    return NextResponse.json({
      status: 'ok',
      report: report.length,
      expiringTokens: expiringTokens.length,
      activeAccounts: activeAccounts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check error:', message);
    await sendTelegram({
      text: `<b>Health Check Failed</b> ❌\n${message}`,
      level: 'error',
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
