/**
 * 12 Chinese zodiac silhouette icons as inline SVG markup.
 *
 * Design rules:
 *   - Each icon is a viewBox 0 0 200 200, designed to fill a square frame.
 *   - All strokes/fills use currentColor so the parent's `color` (set to the
 *     theme `--accent`) drives the tint — no hardcoded hex.
 *   - Stroke-only style (no fills) so the icons read as crisp linework on
 *     dark canvases at any size from 200px to 700px.
 *   - The Earth Branch hanja (子丑寅卯辰巳午未申酉戌亥) is layered behind
 *     the silhouette as a giant translucent backdrop — ties the look to
 *     "Korean astrology" branding instead of generic emoji-style icons.
 *
 * The render tag wraps both into a single SVG block so compositions only
 * need a single placeholder.
 */

interface ZodiacIconSpec {
  /** Earth Branch character (子, 丑, 寅, ...) shown as faded backdrop */
  branch: string;
  /** SVG path d-string(s) for the silhouette. Multiple paths render as separate <path>s. */
  paths: string[];
  /** Optional extra primitives (circles/lines) layered over paths */
  extras?: string;
}

const ICONS: Record<string, ZodiacIconSpec> = {
  Rat: {
    branch: '子',
    paths: [
      // body
      'M 70 130 C 60 110 70 90 95 88 C 120 86 140 100 142 120 C 144 138 130 152 108 152 C 90 152 76 145 70 130 Z',
      // head
      'M 95 88 C 95 75 102 68 112 68 C 122 68 128 76 128 86',
      // tail (curled)
      'M 142 132 C 158 132 164 118 158 104 C 152 92 140 92 134 100',
      // ears
      'M 100 78 m -10 0 a 10 8 0 1 0 20 0 a 10 8 0 1 0 -20 0',
      'M 122 78 m -10 0 a 10 8 0 1 0 20 0 a 10 8 0 1 0 -20 0',
    ],
    extras: '<circle cx="111" cy="80" r="2.5" fill="currentColor"/>',
  },
  Ox: {
    branch: '丑',
    paths: [
      // forehead/face
      'M 70 110 C 70 80 90 70 100 70 C 110 70 130 80 130 110 C 130 138 116 150 100 150 C 84 150 70 138 70 110 Z',
      // left horn (curving outward)
      'M 70 92 C 50 80 40 60 50 50 C 56 44 66 50 72 70',
      // right horn
      'M 130 92 C 150 80 160 60 150 50 C 144 44 134 50 128 70',
      // muzzle
      'M 88 132 L 112 132',
    ],
    extras: '<circle cx="90" cy="108" r="3" fill="currentColor"/><circle cx="110" cy="108" r="3" fill="currentColor"/>',
  },
  Tiger: {
    branch: '寅',
    paths: [
      // face shield
      'M 60 100 C 60 75 80 60 100 60 C 120 60 140 75 140 100 C 140 130 124 152 100 152 C 76 152 60 130 60 100 Z',
      // ears
      'M 64 86 L 56 64 L 78 76',
      'M 136 86 L 144 64 L 122 76',
      // stripe bars (forehead)
      'M 84 78 L 88 90',
      'M 100 76 L 100 90',
      'M 116 78 L 112 90',
      // muzzle line
      'M 100 122 L 100 138',
      'M 100 138 L 92 144',
      'M 100 138 L 108 144',
    ],
    extras: '<circle cx="86" cy="106" r="3.5" fill="currentColor"/><circle cx="114" cy="106" r="3.5" fill="currentColor"/>',
  },
  Rabbit: {
    branch: '卯',
    paths: [
      // long ears
      'M 78 70 C 70 40 76 22 86 22 C 96 22 96 44 92 70',
      'M 122 70 C 130 40 124 22 114 22 C 104 22 104 44 108 70',
      // head/face oval
      'M 70 110 C 70 88 84 76 100 76 C 116 76 130 88 130 110 C 130 134 116 148 100 148 C 84 148 70 134 70 110 Z',
      // mouth Y
      'M 100 122 L 100 132',
      'M 100 132 L 92 138',
      'M 100 132 L 108 138',
    ],
    extras: '<circle cx="88" cy="106" r="3" fill="currentColor"/><circle cx="112" cy="106" r="3" fill="currentColor"/><circle cx="100" cy="124" r="2.5" fill="currentColor"/>',
  },
  Dragon: {
    branch: '辰',
    paths: [
      // body undulation (S-curve)
      'M 30 140 C 60 120 70 150 100 130 C 130 110 140 140 170 120',
      // head
      'M 160 110 C 175 105 178 92 168 84 C 158 76 142 82 140 96',
      // horns
      'M 152 84 L 148 68',
      'M 162 86 L 168 70',
      // spine spikes
      'M 60 130 L 64 122',
      'M 80 138 L 84 130',
      'M 110 124 L 114 116',
      'M 130 132 L 134 124',
    ],
    extras: '<circle cx="158" cy="98" r="2.5" fill="currentColor"/>',
  },
  Snake: {
    branch: '巳',
    paths: [
      // S-shaped body
      'M 50 60 C 90 60 90 110 130 110 C 170 110 170 160 130 160',
      // head (diamond)
      'M 50 60 L 36 50 L 50 40 L 64 50 Z',
      // forked tongue
      'M 130 160 L 144 168',
      'M 130 160 L 144 152',
    ],
    extras: '<circle cx="50" cy="50" r="2" fill="currentColor"/>',
  },
  Horse: {
    branch: '午',
    paths: [
      // arched neck + head
      'M 60 160 C 50 130 60 100 90 80 C 110 66 130 72 138 88 C 144 100 142 116 130 124',
      // muzzle
      'M 130 124 C 138 130 140 142 134 150 C 128 156 118 154 116 146',
      // mane (spikes along neck)
      'M 92 78 L 86 64',
      'M 102 76 L 100 60',
      'M 112 78 L 116 62',
      'M 120 84 L 128 70',
      // ear
      'M 96 78 L 92 66 L 102 70 Z',
    ],
    extras: '<circle cx="124" cy="116" r="2.5" fill="currentColor"/>',
  },
  Sheep: {
    branch: '未',
    paths: [
      // face (tall oval)
      'M 80 88 C 80 76 88 68 100 68 C 112 68 120 76 120 88 L 120 130 C 120 144 112 152 100 152 C 88 152 80 144 80 130 Z',
      // curled horns (spirals)
      'M 80 88 C 60 88 50 100 56 116 C 60 126 72 124 72 116',
      'M 120 88 C 140 88 150 100 144 116 C 140 126 128 124 128 116',
      // muzzle
      'M 92 134 L 108 134',
    ],
    extras: '<circle cx="92" cy="106" r="3" fill="currentColor"/><circle cx="108" cy="106" r="3" fill="currentColor"/>',
  },
  Monkey: {
    branch: '申',
    paths: [
      // outer head
      'M 64 102 C 64 76 82 60 100 60 C 118 60 136 76 136 102 C 136 132 120 154 100 154 C 80 154 64 132 64 102 Z',
      // inner face (heart)
      'M 80 100 C 80 88 90 84 100 92 C 110 84 120 88 120 100 C 120 118 108 134 100 138 C 92 134 80 118 80 100 Z',
      // ears (round)
      'M 60 108 m -10 0 a 10 12 0 1 0 20 0 a 10 12 0 1 0 -20 0',
      'M 140 108 m -10 0 a 10 12 0 1 0 20 0 a 10 12 0 1 0 -20 0',
    ],
    extras: '<circle cx="92" cy="104" r="3" fill="currentColor"/><circle cx="108" cy="104" r="3" fill="currentColor"/>',
  },
  Rooster: {
    branch: '酉',
    paths: [
      // body (egg)
      'M 70 130 C 70 100 86 86 104 86 C 122 86 138 100 138 130 C 138 150 122 160 104 160 C 86 160 70 150 70 130 Z',
      // head
      'M 110 86 C 110 70 122 60 132 64 C 142 68 142 82 134 86',
      // comb (3 spikes)
      'M 118 64 L 116 50',
      'M 126 62 L 126 46',
      'M 134 66 L 138 52',
      // beak
      'M 142 80 L 156 78 L 142 86 Z',
      // tail feathers
      'M 70 110 C 50 100 44 80 50 70',
      'M 70 124 C 46 122 36 108 40 96',
    ],
    extras: '<circle cx="132" cy="78" r="2" fill="currentColor"/>',
  },
  Dog: {
    branch: '戌',
    paths: [
      // head
      'M 70 110 C 70 86 84 72 100 72 C 116 72 130 86 130 110 C 130 134 118 150 100 150 C 82 150 70 134 70 110 Z',
      // floppy ears
      'M 70 96 C 56 86 50 100 54 118 C 58 130 70 132 74 122',
      'M 130 96 C 144 86 150 100 146 118 C 142 130 130 132 126 122',
      // snout
      'M 90 130 C 90 122 96 118 100 118 C 104 118 110 122 110 130 C 110 138 104 142 100 142 C 96 142 90 138 90 130 Z',
      // mouth tongue
      'M 100 142 L 100 150',
    ],
    extras: '<circle cx="88" cy="108" r="3" fill="currentColor"/><circle cx="112" cy="108" r="3" fill="currentColor"/><circle cx="100" cy="128" r="2.5" fill="currentColor"/>',
  },
  Pig: {
    branch: '亥',
    paths: [
      // head (round)
      'M 60 110 C 60 84 80 70 100 70 C 120 70 140 84 140 110 C 140 138 120 152 100 152 C 80 152 60 138 60 110 Z',
      // ears (triangular)
      'M 70 80 L 80 60 L 88 80',
      'M 130 80 L 120 60 L 112 80',
      // snout (large oval)
      'M 84 122 C 84 114 92 110 100 110 C 108 110 116 114 116 122 C 116 130 108 134 100 134 C 92 134 84 130 84 122 Z',
    ],
    extras: '<circle cx="86" cy="100" r="3" fill="currentColor"/><circle cx="114" cy="100" r="3" fill="currentColor"/><circle cx="94" cy="122" r="2.5" fill="currentColor"/><circle cx="106" cy="122" r="2.5" fill="currentColor"/>',
  },
};

/** Ensure a fallback so unknown animal names still produce a valid SVG. */
const FALLBACK: ZodiacIconSpec = ICONS.Tiger;

/**
 * Render an animal's zodiac icon as a self-contained SVG block.
 *
 * Layout: a 200×200 viewBox with the Earth Branch character drawn at ~14%
 * opacity behind the silhouette (so it tints the background of the icon
 * frame in theme accent), then the silhouette in full accent on top.
 *
 * Caller is responsible for sizing (parent CSS sets width/height) and
 * for setting `color: var(--accent)` so currentColor resolves correctly.
 */
export function zodiacIconSvg(animal: string): string {
  const spec = ICONS[animal] ?? FALLBACK;
  const pathTags = spec.paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('');

  return [
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="zodiac-svg">',
    // Branch hanja backdrop — large, low-opacity, lower z than silhouette
    '  <text x="100" y="142" text-anchor="middle" font-family="serif" font-size="180"',
    '        fill="currentColor" opacity="0.13" font-weight="900">',
    spec.branch,
    '  </text>',
    // Decorative ring frame
    '  <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>',
    '  <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>',
    pathTags,
    spec.extras ?? '',
    '</svg>',
  ].join('\n');
}

/** Earth Branch hanja for an animal, exposed separately for compositions
 *  that want to render the character on its own (e.g. as a giant backdrop). */
export function branchHanja(animal: string): string {
  return (ICONS[animal] ?? FALLBACK).branch;
}
