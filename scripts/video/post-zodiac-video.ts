/**
 * Daily zodiac fortune video → render → post to X.
 *
 * Run: npx tsx scripts/video/post-zodiac-video.ts
 *
 * Env: requires X_API_KEY, X_API_SECRET, X_ACCOUNT_1_TOKEN, X_ACCOUNT_1_SECRET,
 *      X_ACCOUNT_1_USERNAME (same vars as the Vercel cron text-post path).
 *
 * Use `--dry-run` to render only and skip the X upload.
 */
import 'dotenv/config';
import { buildZodiacVideo } from '../../lib/video/saju-video-adapter';
import { muxInPlace } from '../../lib/video/mux-audio';
import { postXVideo } from '../../lib/video/x-video-upload';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const accountArg = process.argv.find((a) => a.startsWith('--account='));
  const accountNumber = accountArg ? Number(accountArg.split('=')[1]) : 1;

  console.log(`[zodiac-video] start (dryRun=${dryRun}, account=${accountNumber})`);

  const built = await buildZodiacVideo(new Date());
  console.log(`[zodiac-video] rendered ${built.featuredSign}: ${built.outputPath} (${built.durationMs}ms)`);

  if (built.audioPath) {
    console.log(`[zodiac-video] muxing narration audio onto silent MP4`);
    await muxInPlace(built.outputPath, built.audioPath);
    console.log(`[zodiac-video] mux complete`);
  } else {
    console.log(`[zodiac-video] no audio (TTS skipped or failed) — uploading silent`);
  }

  if (dryRun) {
    console.log('[zodiac-video] --dry-run set, skipping X upload');
    console.log(`[zodiac-video] caption preview:\n${built.caption}`);
    return;
  }

  const posted = await postXVideo(built.caption, built.outputPath, accountNumber);
  if (!posted.success) {
    console.error(`[zodiac-video] X upload failed: ${posted.error} (code=${posted.errorCode})`);
    process.exit(1);
  }
  console.log(`[zodiac-video] posted: tweet ${posted.id}`);
}

main().catch((err) => {
  console.error('[zodiac-video] fatal:', err);
  process.exit(1);
});
