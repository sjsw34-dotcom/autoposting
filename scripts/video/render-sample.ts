/**
 * Render a single zodiac video for a given date.
 *
 * Two-process design (Windows workaround): the actual render runs in a
 * child tsx process, then this parent process muxes the TTS audio onto
 * the resulting silent MP4. The engine's native code (puppeteer-core +
 * ffmpeg) hard-kills its host process on Windows after rendering, which
 * skips our `await` chain — so we keep the parent alive by isolating the
 * render in a disposable child.
 *
 * Run: npx tsx scripts/video/render-sample.ts 2026-05-02
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { muxInPlace } from '../../lib/video/mux-audio';

interface ChildManifest {
  outputPath: string;
  audioPath: string | null;
  featuredSign: string;
  variant: string;
  element: string;
  caption: string;
}

function spawnChild(dateArg: string, manifestPath: string): Promise<number> {
  // Resolve relative to project root (script is always run from there)
  const childScript = path.resolve(process.cwd(), 'scripts/video/_render-child.ts');
  return new Promise((resolve) => {
    const proc = spawn(
      'npx',
      ['tsx', childScript, dateArg, manifestPath],
      { stdio: 'inherit', shell: true }
    );
    proc.on('exit', (code) => resolve(code ?? -1));
    proc.on('error', () => resolve(-1));
  });
}

async function main() {
  const dateArg = process.argv[2];
  if (!dateArg) {
    console.error('usage: render-sample.ts <YYYY-MM-DD>');
    process.exit(1);
  }

  console.log(`SAMPLE_START ${dateArg}`);

  const tmpDir = path.resolve(process.cwd(), 'video/.work');
  await fs.mkdir(tmpDir, { recursive: true });
  const manifestPath = path.join(tmpDir, `manifest-${Date.now()}.json`);

  const code = await spawnChild(dateArg, manifestPath);
  console.log(`[parent] child exited with code=${code}`);

  // Child may exit non-zero due to engine native cleanup, but the manifest
  // is written before that point. If the manifest exists, render succeeded.
  let manifest: ChildManifest | null = null;
  try {
    const json = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(json) as ChildManifest;
  } catch {
    console.error(`SAMPLE_FAIL ${dateArg} — child did not write manifest, render likely failed`);
    process.exit(1);
  }

  // Confirm the silent MP4 was actually written before declaring victory
  try {
    const stat = await fs.stat(manifest.outputPath);
    if (stat.size < 100_000) {
      throw new Error(`MP4 too small (${stat.size} bytes) — render likely incomplete`);
    }
  } catch (err) {
    console.error(`SAMPLE_FAIL ${dateArg} — output MP4 missing or invalid: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (manifest.audioPath) {
    console.log(`[parent] muxing audio: ${manifest.audioPath} → ${manifest.outputPath}`);
    await muxInPlace(manifest.outputPath, manifest.audioPath);
    console.log(`[parent] mux complete`);
  } else {
    console.log(`[parent] no audio to mux (TTS skipped or failed)`);
  }

  await fs.rm(manifestPath, { force: true });

  console.log(
    `SAMPLE_DONE ${dateArg} sign=${manifest.featuredSign} layout=${manifest.variant} element=${manifest.element} audio=${manifest.audioPath ? 'yes' : 'no'} file=${manifest.outputPath}`
  );
}

main().catch((err) => {
  console.error('SAMPLE_FAIL', err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
