/**
 * Render multiple zodiac videos across different days to verify variation
 * (different layouts + different element themes appear). Use to QA visual
 * variety before any real X posting.
 *
 * Run: npx tsx scripts/video/test-variations.ts
 *      npx tsx scripts/video/test-variations.ts --count=6
 */
import 'dotenv/config';
import { buildZodiacVideo } from '../../lib/video/saju-video-adapter';

async function main() {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? Number(countArg.split('=')[1]) : 4;

  console.log(`[variations] rendering ${count} consecutive days starting from today`);

  const today = new Date();
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const built = await buildZodiacVideo(d);
    const key = `${built.variant}/${built.element}`;
    seen.add(key);
    console.log(
      `  day +${i} (${d.toISOString().slice(0, 10)}): ${built.featuredSign.padEnd(8)} | layout=${built.variant.padEnd(8)} theme=${built.element.padEnd(6)} | ${(built.durationMs / 1000).toFixed(1)}s | ${built.outputPath}`
    );
  }

  console.log(`\n[variations] ${seen.size} distinct (layout × theme) combinations:`);
  for (const k of seen) console.log(`  · ${k}`);
}

main().catch((err) => {
  console.error('[variations] fatal:', err);
  process.exit(1);
});
