const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramMessage {
  text: string;
  level: 'info' | 'warn' | 'error' | 'critical';
}

function getEmoji(level: TelegramMessage['level']): string {
  switch (level) {
    case 'info': return 'ℹ️';
    case 'warn': return '⚠️';
    case 'error': return '🔴';
    case 'critical': return '🚨';
  }
}

/**
 * 텔레그램 메시지 전송
 */
export async function sendTelegram(msg: TelegramMessage): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram not configured, skipping notification');
    return false;
  }

  const text = `${getEmoji(msg.level)} ${msg.text}`;

  try {
    const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram send failed:', error);
    return false;
  }
}

/**
 * 포스팅 성공 알림
 */
export async function notifyPostSuccess(
  platform: string,
  accountId: string,
  contentType: string
) {
  await sendTelegram({
    text: `<b>${platform.toUpperCase()}</b> @${accountId}\nPosted: ${contentType} ✅`,
    level: 'info',
  });
}

/**
 * 포스팅 실패 알림
 */
export async function notifyPostFailure(
  platform: string,
  accountId: string,
  error: string,
  circuitOpened: boolean
) {
  const level = circuitOpened ? 'critical' : 'error';
  const extra = circuitOpened ? '\n🔒 Circuit breaker OPENED — account paused 24h' : '';
  await sendTelegram({
    text: `<b>${platform.toUpperCase()}</b> @${accountId}\nFailed: ${error}${extra}`,
    level,
  });
}

/**
 * HTTP 403 긴급 알림
 */
export async function notifyForbidden(platform: string, accountId: string) {
  await sendTelegram({
    text: `<b>🚨 EMERGENCY: HTTP 403</b>\n${platform.toUpperCase()} @${accountId}\nPossible account ban/block!\nAll posting STOPPED for 7 days.`,
    level: 'critical',
  });
}

/**
 * 월간 한도 경고
 */
export async function notifyMonthlyLimitWarning(
  platform: string,
  accountId: string,
  current: number,
  limit: number
) {
  await sendTelegram({
    text: `<b>${platform.toUpperCase()}</b> @${accountId}\nMonthly limit approaching: ${current}/${limit} (${Math.round(current/limit*100)}%)`,
    level: 'warn',
  });
}

/**
 * 인간 행동 스킵 알림 (연속 스킵 감시용)
 */
export async function notifyHumanSkip(
  platform: string,
  accountId: string,
  reason: string
) {
  await sendTelegram({
    text: `<b>${platform.toUpperCase()}</b> @${accountId}\nSkipped: ${reason} 💤`,
    level: 'warn',
  });
}

/**
 * 일일 리포트 생성 및 전송
 */
export async function sendDailyReport(
  reportData: {
    platform: string;
    account_id: string;
    success_count: string;
    failed_count: string;
    skipped_count: string;
  }[]
) {
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  let lines = ['📊 <b>Social Autoposter Daily Report</b>', '━━━━━━━━━━━━━━━━━━━━'];

  for (const row of reportData) {
    const success = parseInt(row.success_count);
    const failed = parseInt(row.failed_count);
    const skipped = parseInt(row.skipped_count);
    totalSuccess += success;
    totalFailed += failed;
    totalSkipped += skipped;

    const status = failed > 0 ? '❌' : skipped > 0 ? '⚠️' : '✅';
    lines.push(`📌 ${row.platform} @${row.account_id}: ${success}/${success + failed + skipped} ${status}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`✅ Success: ${totalSuccess}  ⚠️ Skipped: ${totalSkipped}  ❌ Failed: ${totalFailed}`);

  await sendTelegram({
    text: lines.join('\n'),
    level: totalFailed > 0 ? 'warn' : 'info',
  });
}
