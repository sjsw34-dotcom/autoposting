import fs from 'node:fs/promises';

/**
 * ElevenLabs TTS client.
 *
 * Uses the `with-timestamps` endpoint so we get character-level alignment
 * back, which we need for word-synced captions in compositions.
 *
 * Env vars:
 *   ELEVENLABS_API_KEY                          (required)
 *   ELEVENLABS_VOICE_IDS  comma-separated list, rotated deterministically by date.
 *                         Falls back to ELEVENLABS_VOICE_ID, then Sarah default.
 *   ELEVENLABS_VOICE_ID   single voice ID (used if ELEVENLABS_VOICE_IDS unset).
 *   ELEVENLABS_MODEL_ID   default: "eleven_multilingual_v2"  (best quality + emotion)
 */

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

/**
 * Resolve the voice ID for a given date.
 *
 * Resolution order:
 *   1. Explicit override argument.
 *   2. ELEVENLABS_VOICE_IDS (comma-separated): rotate deterministically by
 *      day-of-year so each day picks a different voice but the same date
 *      always picks the same voice (idempotent across retries).
 *   3. ELEVENLABS_VOICE_ID (single).
 *   4. Sarah default.
 */
export function pickVoiceId(date: Date = new Date(), override?: string): string {
  if (override) return override;

  const list = (process.env.ELEVENLABS_VOICE_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length > 0) {
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return list[dayOfYear % list.length];
  }

  return process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
}

export interface TtsAlignment {
  characters: string[];
  characterStartSeconds: number[];
  characterEndSeconds: number[];
}

export interface TtsResult {
  /** mp3 audio file path on disk */
  audioPath: string;
  /** total audio duration in seconds */
  durationSec: number;
  /** character-level timing for caption sync */
  alignment: TtsAlignment;
}

interface TimestampedResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
  normalized_alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
}

export interface TtsOptions {
  /** Override voice ID (default: ELEVENLABS_VOICE_ID env or Sarah) */
  voiceId?: string;
  /** Override model ID (default: eleven_multilingual_v2) */
  modelId?: string;
  /** 0–1, higher = more consistent / less expressive. Default 0.45 — leaves emotion in. */
  stability?: number;
  /** 0–1, higher = sticks closer to voice fingerprint. Default 0.75. */
  similarityBoost?: number;
  /** 0–1, exaggerated style. Default 0.4 for cinematic mystic delivery. */
  style?: number;
  /** Use speaker boost — slight clarity bump. Default true. */
  useSpeakerBoost?: boolean;
}

/**
 * Generate narration audio with character-level timestamps.
 * Writes mp3 to `audioPath` and returns alignment for caption rendering.
 */
export async function generateTtsWithTimestamps(
  text: string,
  audioPath: string,
  opts: TtsOptions = {}
): Promise<TtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voiceId = pickVoiceId(new Date(), opts.voiceId);
  const modelId = opts.modelId ?? process.env.ELEVENLABS_MODEL_ID ?? DEFAULT_MODEL_ID;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`;
  const body = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: opts.stability ?? 0.45,
      similarity_boost: opts.similarityBoost ?? 0.75,
      style: opts.style ?? 0.4,
      use_speaker_boost: opts.useSpeakerBoost ?? true,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as TimestampedResponse;
  const align = json.alignment ?? json.normalized_alignment;
  if (!align) throw new Error('ElevenLabs response missing alignment');

  const audioBuffer = Buffer.from(json.audio_base64, 'base64');
  await fs.writeFile(audioPath, audioBuffer);

  const lastEnd = align.character_end_times_seconds[align.character_end_times_seconds.length - 1] ?? 0;

  return {
    audioPath,
    durationSec: lastEnd,
    alignment: {
      characters: align.characters,
      characterStartSeconds: align.character_start_times_seconds,
      characterEndSeconds: align.character_end_times_seconds,
    },
  };
}
