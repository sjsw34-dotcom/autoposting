import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require_ = createRequire(__filename);

/**
 * Mux an mp3 narration onto a silent rendered MP4 using ffmpeg directly.
 * Avoids the @hyperframes/producer audio pipeline which hangs on Windows
 * paths that contain Korean characters (the engine's spawn call to
 * ffmpeg/ffprobe never returns).
 *
 * Result: the input video is renamed to a tmp path, ffmpeg writes the
 * muxed output back to the original target path, then the tmp is deleted.
 */
export async function muxAudioIntoVideo(
  silentMp4Path: string,
  audioPath: string,
  finalMp4Path: string
): Promise<void> {
  const ffmpegBin: string | null = require_('ffmpeg-static');
  if (!ffmpegBin) throw new Error('ffmpeg-static did not resolve');

  const args = [
    '-y',
    '-i', silentMp4Path,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    finalMp4Path,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg mux failed (exit ${code}): ${stderr.slice(-400)}`));
    });
  });
}

/**
 * Mux audio into a rendered video, replacing the original silent file
 * with the muxed version. Uses an atomic temp-file dance.
 */
export async function muxInPlace(videoPath: string, audioPath: string): Promise<void> {
  const tmp = `${videoPath}.silent.tmp.mp4`;
  await fs.rename(videoPath, tmp);
  try {
    await muxAudioIntoVideo(tmp, audioPath, videoPath);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}
