import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { RenderConfig } from '@hyperframes/producer';

const require_ = createRequire(__filename);

/**
 * Ensure ffmpeg + ffprobe binaries are on PATH before the producer spawns
 * them. Hyperframes engine looks both up from PATH; this prepends the
 * static binaries' directories so renders work without system-installed
 * ffmpeg. ffprobe is required whenever the composition contains an
 * `<audio>` element (the engine probes its duration).
 */
function ensureFfmpegOnPath(): void {
  const sep = process.platform === 'win32' ? ';' : ':';

  const dirs: string[] = [];

  const ffmpegBin: string | null = require_('ffmpeg-static');
  if (!ffmpegBin) throw new Error('ffmpeg-static did not resolve a binary path');
  dirs.push(path.dirname(ffmpegBin));

  // ffprobe-static exports an object: { path: '/abs/path/to/ffprobe' }
  const ffprobeMod = require_('ffprobe-static') as { path?: string };
  const ffprobeBin = ffprobeMod?.path;
  if (!ffprobeBin) throw new Error('ffprobe-static did not resolve a binary path');
  dirs.push(path.dirname(ffprobeBin));

  const currentParts = (process.env.PATH ?? '').split(sep);
  const missing = dirs.filter((d) => !currentParts.includes(d));
  if (missing.length) {
    process.env.PATH = [...missing, ...currentParts].join(sep);
  }
}

export interface RenderInput {
  projectDir: string;
  outputPath: string;
  fps?: 24 | 30 | 60;
  quality?: 'draft' | 'standard' | 'high';
}

export interface RenderResult {
  outputPath: string;
  totalFrames: number;
  durationMs: number;
}

/**
 * Render a staged composition project directory to MP4.
 * Project dir must contain index.html with a registered window.__timelines.
 */
export async function renderComposition(input: RenderInput): Promise<RenderResult> {
  ensureFfmpegOnPath();

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });

  // ESM-only package — load via dynamic import so this module works under
  // both CJS (tsx default for .ts) and ESM contexts.
  const { createRenderJob, executeRenderJob } = await import('@hyperframes/producer');


  const config: RenderConfig = {
    fps: input.fps ?? 30,
    quality: input.quality ?? 'standard',
    format: 'mp4',
  };

  const job = createRenderJob(config);
  const started = Date.now();

  try {
    await executeRenderJob(job, input.projectDir, input.outputPath, (j, msg) => {
      if (process.env.DEBUG_VIDEO) {
        process.stdout.write(`[render ${j.status} ${j.progress}%] ${msg}\n`);
      }
    });
  } catch (err) {
    process.stderr.write(
      `\n[renderer] executeRenderJob threw — status=${job.status}, stage=${job.failedStage ?? 'unknown'}, error=${err instanceof Error ? err.stack ?? err.message : String(err)}\n`
    );
    if (job.errorDetails) {
      process.stderr.write(`[renderer] errorDetails: ${JSON.stringify(job.errorDetails, null, 2)}\n`);
    }
    throw err;
  }

  if (job.status !== 'complete') {
    throw new Error(
      `Render failed (status=${job.status}, stage=${job.failedStage ?? 'unknown'}): ${job.error ?? 'no error'}`
    );
  }

  // Producer leaves a sibling `work-<uuid>/` next to the output MP4 with
  // captured frames + temp encodings. Remove it on success so video/output/
  // doesn't accumulate gigabytes after repeated renders.
  await cleanupSiblingWorkDirs(input.outputPath);

  return {
    outputPath: input.outputPath,
    totalFrames: job.totalFrames ?? 0,
    durationMs: Date.now() - started,
  };
}

async function cleanupSiblingWorkDirs(outputPath: string): Promise<void> {
  try {
    const dir = path.dirname(outputPath);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((e) => e.isDirectory() && e.name.startsWith('work-'))
        .map((e) => fs.rm(path.join(dir, e.name), { recursive: true, force: true }))
    );
  } catch {
    // best-effort cleanup; never fail the render on this
  }
}
