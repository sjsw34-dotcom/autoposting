import path from 'node:path';
import fs from 'node:fs/promises';
import { generateZodiacFortune } from '../content/zodiac-fortune';
import { stageComposition } from './template-fill';
import { renderComposition } from './renderer';
import { pickZodiacVariation, pickInsightVariation } from './variation-selector';
import { themeRootCss, type VideoTheme } from './themes';
import { generateTtsWithTimestamps, pickVoiceId } from './tts-elevenlabs';
import { alignmentToCaptions, captionsToHtml, captionsToGsapTweens } from './captions';

const COMPOSITIONS_DIR = path.resolve(process.cwd(), 'video/compositions');
const WORK_ROOT = path.resolve(process.cwd(), 'video/.work');
const OUTPUT_DIR = path.resolve(process.cwd(), 'video/output');

function themeVars(theme: VideoTheme) {
  return {
    THEME_ROOT: themeRootCss(theme),
    AMBIENT_CSS: theme.ambientCss,
    AMBIENT_HTML: theme.ambientHtml,
    HEAD_EASE: theme.headlineEase,
    BODY_EASE: theme.bodyEase,
    ENERGY_LABEL: theme.energyLabel,
  };
}

/** Tail buffer after audio ends, before composition fades out. */
const AUDIO_TAIL_SEC = 1.5;

export interface NarrationVars {
  AUDIO_HTML: string;
  CAPTIONS_HTML: string;
  CAPTIONS_GSAP: string;
  AUDIO_DURATION: string;
  TOTAL_DURATION: string;
}

interface NarrationBuildResult {
  vars: NarrationVars;
  /** mp3 path if TTS succeeded — caller must mux it onto the rendered MP4 post-render. */
  audioPath: string | null;
}

/**
 * Build TTS audio + captions for a narration script.
 *
 * Audio file is written to the project dir but NOT embedded as `<audio>`
 * in the composition — Hyperframes' engine audio pipeline hangs on
 * Windows paths with Korean characters (silent process death on the
 * "Processing audio tracks" stage). Instead, the audio is muxed onto the
 * rendered silent MP4 in a separate ffmpeg pass after render completes.
 *
 * Captions are still embedded in the composition; their timestamps come
 * from the same TTS alignment so they sync perfectly with the muxed audio.
 */
async function buildNarration(
  narrationText: string,
  projectDir: string,
  fallbackDurationSec: number,
  date: Date
): Promise<NarrationBuildResult> {
  const skipTts = process.env.SKIP_TTS === '1' || !process.env.ELEVENLABS_API_KEY;

  const silent: NarrationVars = {
    AUDIO_HTML: '',
    CAPTIONS_HTML: '',
    CAPTIONS_GSAP: '',
    AUDIO_DURATION: fallbackDurationSec.toFixed(2),
    TOTAL_DURATION: fallbackDurationSec.toFixed(2),
  };

  if (skipTts) return { vars: silent, audioPath: null };

  await fs.mkdir(projectDir, { recursive: true });
  const audioPath = path.join(projectDir, 'narration.mp3');

  const voiceId = pickVoiceId(date);

  let result;
  try {
    result = await generateTtsWithTimestamps(narrationText, audioPath, { voiceId });
  } catch (err) {
    console.warn(`[narration] TTS failed, falling back to silent: ${err instanceof Error ? err.message : err}`);
    return { vars: silent, audioPath: null };
  }

  const phrases = alignmentToCaptions(result.alignment);
  const totalDur = Math.max(fallbackDurationSec, result.durationSec + AUDIO_TAIL_SEC);

  return {
    vars: {
      AUDIO_HTML: '',  // intentionally empty — audio muxed post-render via ffmpeg
      CAPTIONS_HTML: captionsToHtml(phrases),
      CAPTIONS_GSAP: captionsToGsapTweens(phrases),
      AUDIO_DURATION: result.durationSec.toFixed(3),
      TOTAL_DURATION: totalDur.toFixed(3),
    },
    audioPath,
  };
}

export interface ZodiacVideoResult {
  outputPath: string;
  /** mp3 narration written next to the rendered MP4. Caller must mux it
   *  onto outputPath via lib/video/mux-audio if non-null. */
  audioPath: string | null;
  caption: string;
  featuredSign: string;
  variant: string;
  element: string;
  durationMs: number;
  hasAudio: boolean;
}

function buildZodiacNarration(opts: {
  energyLabel: string;
  dateStr: string;
  animal: string;
  years: string;
  fortune: string;
  cta: string;
}): string {
  // Strip Korean chunks from energy label for TTS (keep just the English half)
  const energyEn = opts.energyLabel.split('·')[0].trim();
  const fortune = opts.fortune.replace(/\s+/g, ' ').trim();
  const cleanFortune = fortune.endsWith('.') ? fortune : `${fortune}.`;

  return [
    `${energyEn}.`,
    `${opts.dateStr}.`,
    `Year of the ${opts.animal}.`,
    `If you were born in ${opts.years.replace(/,/g, ', ')}, this reading is for you.`,
    cleanFortune,
    `Free saju reading at sajumuse dot com.`,
  ].join(' ');
}

export interface BuildOptions {
  /**
   * Fires after staging + TTS but BEFORE rendering, so callers can persist
   * a recovery manifest. The engine's native cleanup hard-kills the host
   * process on Windows after rendering completes; if the parent process
   * relies on a post-render write, that write never lands. Use this hook
   * to write everything you'd need to recover from a render-side crash.
   */
  onPrepared?: (info: {
    outputPath: string;
    audioPath: string | null;
    featuredSign: string;
    variant: string;
    element: string;
    caption: string;
  }) => Promise<void> | void;
}

export async function buildZodiacVideo(
  date: Date = new Date(),
  opts: BuildOptions = {}
): Promise<ZodiacVideoResult> {
  const fortune = generateZodiacFortune(date);

  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const featuredIdx = dayOfYear % fortune.signs.length;
  const featured = fortune.signs[featuredIdx];

  const variation = pickZodiacVariation(date, featured.animal);

  const subline = `${featured.emoji} If you were born in ${featured.years}, this is for you.`;
  const ctaLine = fortune.cta.length > 36 ? 'Find Yours' : fortune.cta;

  const jobId = `zodiac-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${variation.layout.id}-${variation.theme.id}`;
  const stagingDir = path.join(WORK_ROOT, jobId);

  // Prepare narration BEFORE staging the HTML so it lands in the same project dir
  const narrationText = buildZodiacNarration({
    energyLabel: variation.theme.energyLabel,
    dateStr: fortune.dateStr,
    animal: featured.animal,
    years: featured.years,
    fortune: featured.fortune,
    cta: ctaLine,
  });

  const narration = await buildNarration(narrationText, stagingDir, variation.layout.durationSec, date);

  const projectDir = await stageComposition(
    path.join(COMPOSITIONS_DIR, variation.layout.file),
    {
      ...themeVars(variation.theme),
      ...narration.vars,
      DATE_LABEL: fortune.dateStr.toUpperCase(),
      SIGN_HEADLINE: featured.animal.toUpperCase(),
      SIGN_SUBLINE: subline,
      FORTUNE_TEXT: featured.fortune,
      CTA_LINE: ctaLine.toUpperCase(),
    },
    WORK_ROOT,
    jobId
  );

  const outputPath = path.join(OUTPUT_DIR, `${jobId}.mp4`);

  const caption = [
    fortune.hook,
    '',
    `${featured.emoji} ${featured.animal} (${featured.years})`,
    `→ ${featured.fortune}`,
    '',
    fortune.cta,
  ].join('\n');

  // Persist a recovery manifest BEFORE rendering — the engine's native
  // cleanup may kill this process after the MP4 is written but before our
  // await chain returns. The parent process reads this manifest to recover.
  if (opts.onPrepared) {
    await opts.onPrepared({
      outputPath,
      audioPath: narration.audioPath,
      featuredSign: featured.animal,
      variant: variation.layout.id,
      element: variation.theme.id,
      caption,
    });
  }

  const result = await renderComposition({ projectDir, outputPath, fps: 30, quality: 'standard' });

  return {
    outputPath: result.outputPath,
    audioPath: narration.audioPath,
    caption,
    featuredSign: featured.animal,
    variant: variation.layout.id,
    element: variation.theme.id,
    durationMs: result.durationMs,
    hasAudio: narration.audioPath !== null,
  };
}

export interface InsightVideoInput {
  category: 'INSIGHT' | 'WEALTH' | 'LOVE' | 'CAREER';
  hook: string;
  body: string;
  cta?: string;
}

export async function buildInsightVideo(
  input: InsightVideoInput,
  date: Date = new Date()
): Promise<{
  outputPath: string;
  audioPath: string | null;
  durationMs: number;
  variant: string;
  element: string;
  hasAudio: boolean;
}> {
  const variation = pickInsightVariation(date, input.category);

  const jobId = `insight-${input.category.toLowerCase()}-${variation.layout.id}-${variation.theme.id}-${Date.now()}`;
  const stagingDir = path.join(WORK_ROOT, jobId);

  const narrationText = [
    `Saju ${input.category.toLowerCase()}.`,
    `${input.hook.replace(/\s+/g, ' ').trim()}.`,
    `${input.body.replace(/\s+/g, ' ').trim()}.`,
    `${input.cta ?? 'Read yours free'} at sajumuse dot com.`,
  ].join(' ');

  const narration = await buildNarration(narrationText, stagingDir, variation.layout.durationSec, date);

  const projectDir = await stageComposition(
    path.join(COMPOSITIONS_DIR, variation.layout.file),
    {
      ...themeVars(variation.theme),
      ...narration.vars,
      CATEGORY_LABEL: `SAJU · ${input.category}`,
      HOOK_LINE: input.hook,
      BODY_TEXT: input.body,
      CTA_LINE: (input.cta ?? 'Read Yours Free').toUpperCase(),
    },
    WORK_ROOT,
    jobId
  );

  const outputPath = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const result = await renderComposition({ projectDir, outputPath, fps: 30, quality: 'standard' });

  // Audio mux happens in the parent process (see buildZodiacVideo note above).
  return {
    outputPath: result.outputPath,
    audioPath: narration.audioPath,
    durationMs: result.durationMs,
    variant: variation.layout.id,
    element: variation.theme.id,
    hasAudio: narration.audioPath !== null,
  };
}
