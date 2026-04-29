/**
 * Internal child script — runs only the silent render + TTS generation.
 * The parent (render-sample.ts) spawns this and reads the manifest it
 * writes, then handles audio mux in a fresh process so we don't get killed
 * by the engine's post-render native cleanup on Windows.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'node:fs/promises';
import { buildZodiacVideo } from '../../lib/video/saju-video-adapter';

async function main() {
  const dateArg = process.argv[2];
  const manifestPath = process.argv[3];
  if (!dateArg || !manifestPath) {
    console.error('usage: _render-child.ts <YYYY-MM-DD> <manifest.json>');
    process.exit(1);
  }
  const [y, m, d] = dateArg.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  console.log(`CHILD_START ${dateArg}`);

  // The onPrepared hook runs after staging+TTS but BEFORE the engine
  // takes over rendering. We persist the manifest there so even if the
  // engine's native cleanup kills the process post-render, the parent
  // can still recover (the MP4 file already exists at outputPath).
  await buildZodiacVideo(date, {
    onPrepared: async (info) => {
      await fs.writeFile(manifestPath, JSON.stringify(info, null, 2), 'utf8');
      console.log(`CHILD_MANIFEST_WRITTEN ${manifestPath}`);
    },
  });

  console.log(`CHILD_DONE`);
  process.exit(0);
}

main().catch((err) => {
  console.error('CHILD_FAIL', err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
