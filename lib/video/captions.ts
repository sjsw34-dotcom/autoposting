import type { TtsAlignment } from './tts-elevenlabs';

export interface CaptionPhrase {
  text: string;
  startSec: number;
  endSec: number;
}

/**
 * Group ElevenLabs character-level timestamps into reading-friendly phrases.
 *
 * On a 1080×1920 vertical canvas with ~46px italic body text, ~3-4 words at
 * a time is the sweet spot — long enough to read in one glance, short enough
 * to feel kinetic instead of like a wall of text.
 *
 * Phrase boundaries: punctuation (`. , ; — :`) or word count cap.
 */
export function alignmentToCaptions(
  alignment: TtsAlignment,
  opts: { maxWordsPerPhrase?: number; minPhraseSec?: number } = {}
): CaptionPhrase[] {
  const maxWords = opts.maxWordsPerPhrase ?? 4;
  const minPhrase = opts.minPhraseSec ?? 0.6;

  const { characters, characterStartSeconds, characterEndSeconds } = alignment;

  // First pass: collect words with their start/end times
  type Word = { text: string; start: number; end: number; trailingPunct: string };
  const words: Word[] = [];

  let cur = '';
  let curStart = -1;
  let curEnd = -1;

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    const startT = characterStartSeconds[i] ?? curEnd;
    const endT = characterEndSeconds[i] ?? startT;

    if (/\s/.test(ch)) {
      if (cur) {
        words.push({ text: cur, start: curStart, end: curEnd, trailingPunct: '' });
        cur = '';
      }
      continue;
    }
    if (/[.,;:!?—–-]/.test(ch)) {
      if (cur) {
        words.push({ text: cur, start: curStart, end: endT, trailingPunct: ch });
        cur = '';
      } else if (words.length) {
        words[words.length - 1].trailingPunct += ch;
        words[words.length - 1].end = endT;
      }
      continue;
    }
    if (!cur) curStart = startT;
    cur += ch;
    curEnd = endT;
  }
  if (cur) words.push({ text: cur, start: curStart, end: curEnd, trailingPunct: '' });

  // Second pass: group into phrases, breaking on punctuation OR word cap
  const phrases: CaptionPhrase[] = [];
  let group: Word[] = [];

  const flush = () => {
    if (!group.length) return;
    const text = group
      .map((w, i) => w.text + (w.trailingPunct && i < group.length - 1 ? w.trailingPunct + ' ' : w.trailingPunct))
      .join(' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();
    const startSec = group[0].start;
    const endSec = group[group.length - 1].end;
    if (endSec - startSec >= minPhrase || phrases.length === 0) {
      phrases.push({ text, startSec, endSec });
    } else {
      // too short — extend previous phrase if possible
      if (phrases.length) {
        const prev = phrases[phrases.length - 1];
        prev.text += ` ${text}`;
        prev.endSec = endSec;
      } else {
        phrases.push({ text, startSec, endSec });
      }
    }
    group = [];
  };

  for (const w of words) {
    group.push(w);
    const breakOnPunct = /[.,;:!?—]/.test(w.trailingPunct);
    if (breakOnPunct || group.length >= maxWords) flush();
  }
  flush();

  return phrases;
}

/**
 * Render the captions as a block of timed `<div>`s suitable for embedding
 * inside a Hyperframes composition. Each div fades in/out via GSAP — the
 * caller injects the GSAP timeline tweens via `captionsToGsapTweens()`.
 */
export function captionsToHtml(phrases: CaptionPhrase[]): string {
  return phrases
    .map(
      (p, i) =>
        `<div class="caption" id="caption-${i}" data-start="${p.startSec.toFixed(3)}" data-end="${p.endSec.toFixed(3)}" style="opacity:0;">${escapeHtml(p.text)}</div>`
    )
    .join('\n');
}

/**
 * GSAP tween fragment that fades captions in/out at their timestamps.
 * Inject inside an existing `gsap.timeline()` builder block.
 */
export function captionsToGsapTweens(phrases: CaptionPhrase[]): string {
  return phrases
    .map(
      (p, i) =>
        // 0.18s fade in, hold, 0.18s fade out — overlap minimized via min phrase length
        `tl.to("#caption-${i}", { opacity: 1, duration: 0.18, ease: "power2.out" }, ${p.startSec.toFixed(3)});\n` +
        `tl.to("#caption-${i}", { opacity: 0, duration: 0.18, ease: "power2.in" },  ${(p.endSec - 0.05).toFixed(3)});`
    )
    .join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
