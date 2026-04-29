import type { Element } from './zodiac-elements';

/**
 * Element-driven visual themes for video compositions.
 * Each theme provides:
 *   - palette (canvas/ink/accent + a secondary accent for layered glow)
 *   - ambient: HTML markup + scoped CSS for the background layer.
 *     This is what makes Wood feel different from Fire even before any
 *     foreground typography is animated.
 *   - motion: GSAP ease defaults so each element has a distinct animation feel.
 *
 * Themes are deterministic (no randomness) and never reference fal.ai —
 * everything is CSS/SVG so it renders inside Hyperframes' headless Chrome
 * without external assets.
 */

export interface VideoTheme {
  id: Element;
  // CSS custom properties applied at :root by the composition adapter
  vars: {
    canvas: string; // body background base
    surface: string; // card / inner surface
    border: string; // hairline strokes
    ink: string; // primary text on dark
    accent: string; // hot accent (one element per scene)
    accent2: string; // secondary glow tone
    chip: string; // muted label color
  };
  // Markup injected into the canvas root for the background layer.
  // Must be self-contained: SVG/divs only, no external src.
  ambientHtml: string;
  // Scoped CSS for the ambient layer + element-specific motion overrides.
  // All selectors should live under .ambient or :root scope to avoid leak.
  ambientCss: string;
  // GSAP ease for the headline entrance (varies the motion fingerprint
  // across elements without rewriting timeline code in each composition)
  headlineEase: string;
  bodyEase: string;
  // English label shown in the chip area, e.g. "WOOD ENERGY"
  energyLabel: string;
}

export const THEME_WOOD: VideoTheme = {
  id: 'wood',
  vars: {
    canvas: '#0A1410',
    surface: '#162822',
    border: '#1F3D33',
    ink: '#E8F5E1',
    accent: '#4ADE80',
    accent2: '#F5E6C8',
    chip: '#3E5A4D',
  },
  ambientHtml: `
    <div class="ambient-base"></div>
    <svg class="ambient-fx" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="wood-grain"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.87  0 0 0 0 0.5  0 0 0 0.05 0"/></filter>
      </defs>
      <rect width="1080" height="1920" filter="url(#wood-grain)"/>
      <g class="leaves" stroke="#4ADE80" stroke-width="2" fill="none" opacity="0.18">
        <path d="M120 200 Q 180 260 240 220" />
        <path d="M880 480 Q 940 540 1000 500" />
        <path d="M180 1100 Q 240 1160 300 1120" />
        <path d="M820 1620 Q 880 1680 940 1640" />
      </g>
    </svg>
  `,
  ambientCss: `
    .ambient-base {
      position: absolute; inset: -10%;
      background:
        radial-gradient(ellipse at 30% 20%, rgba(74,222,128,0.25), transparent 55%),
        radial-gradient(ellipse at 80% 90%, rgba(245,230,200,0.10), transparent 60%);
    }
    .ambient-fx { position: absolute; inset: 0; mix-blend-mode: screen; opacity: 0.75; }
    .leaves path { transform-origin: center; }
  `,
  headlineEase: 'power3.out',
  bodyEase: 'power2.out',
  energyLabel: 'WOOD ENERGY · 木',
};

export const THEME_FIRE: VideoTheme = {
  id: 'fire',
  vars: {
    canvas: '#1A0808',
    surface: '#2A1410',
    border: '#4A2A1F',
    ink: '#FFE5D0',
    accent: '#F59E0B',
    accent2: '#FF6B6B',
    chip: '#6B3F2F',
  },
  ambientHtml: `
    <div class="ambient-base"></div>
    <div class="ember a"></div><div class="ember b"></div><div class="ember c"></div>
    <svg class="ambient-fx" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="flame-glow" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.4"/>
          <stop offset="60%" stop-color="#FF6B6B" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#1A0808" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#flame-glow)"/>
    </svg>
  `,
  ambientCss: `
    .ambient-base {
      position: absolute; inset: -10%;
      background:
        radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.30), transparent 50%),
        radial-gradient(ellipse at 20% 30%, rgba(255,107,107,0.10), transparent 60%);
    }
    .ambient-fx { position: absolute; inset: 0; opacity: 0.9; }
    .ember {
      position: absolute; width: 6px; height: 6px;
      background: #F59E0B; border-radius: 50%;
      box-shadow: 0 0 24px 8px rgba(245,158,11,0.6);
      filter: blur(1px);
    }
    .ember.a { left: 18%; top: 60%; }
    .ember.b { left: 78%; top: 40%; }
    .ember.c { left: 50%; top: 80%; }
  `,
  headlineEase: 'expo.out',
  bodyEase: 'power3.out',
  energyLabel: 'FIRE ENERGY · 火',
};

export const THEME_EARTH: VideoTheme = {
  id: 'earth',
  vars: {
    canvas: '#1A1410',
    surface: '#2A2018',
    border: '#3A2F22',
    ink: '#F5E6C8',
    accent: '#D97706',
    accent2: '#FCD34D',
    chip: '#5C4730',
  },
  ambientHtml: `
    <div class="ambient-base"></div>
    <svg class="ambient-fx" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="earth-grain"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.85  0 0 0 0 0.46  0 0 0 0 0.02  0 0 0 0.06 0"/></filter>
      </defs>
      <rect width="1080" height="1920" filter="url(#earth-grain)"/>
    </svg>
  `,
  ambientCss: `
    .ambient-base {
      position: absolute; inset: -10%;
      background:
        radial-gradient(ellipse at 50% 50%, rgba(217,119,6,0.18), transparent 55%),
        radial-gradient(ellipse at 70% 20%, rgba(252,211,77,0.06), transparent 60%);
    }
    .ambient-fx { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: 1; }
  `,
  headlineEase: 'power2.inOut',
  bodyEase: 'power1.out',
  energyLabel: 'EARTH ENERGY · 土',
};

export const THEME_METAL: VideoTheme = {
  id: 'metal',
  vars: {
    canvas: '#0E0E14',
    surface: '#1A1A26',
    border: '#2D2D40',
    ink: '#F0F2F5',
    accent: '#E5E5E5',
    accent2: '#9CA3AF',
    chip: '#4A4F5C',
  },
  ambientHtml: `
    <div class="ambient-base"></div>
    <svg class="ambient-fx" viewBox="0 0 1080 1920" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="#E5E5E5" stroke-width="1" opacity="0.18">
        <line x1="0" y1="320" x2="1080" y2="280"/>
        <line x1="0" y1="640" x2="1080" y2="700"/>
        <line x1="0" y1="1280" x2="1080" y2="1240"/>
        <line x1="0" y1="1600" x2="1080" y2="1660"/>
      </g>
      <g stroke="#9CA3AF" stroke-width="0.5" opacity="0.10">
        <line x1="0" y1="160" x2="1080" y2="180"/>
        <line x1="0" y1="960" x2="1080" y2="940"/>
        <line x1="0" y1="1760" x2="1080" y2="1780"/>
      </g>
    </svg>
  `,
  ambientCss: `
    .ambient-base {
      position: absolute; inset: -10%;
      background:
        linear-gradient(160deg, rgba(229,229,229,0.06), transparent 40%),
        radial-gradient(ellipse at 50% 50%, rgba(156,163,175,0.10), transparent 60%);
    }
    .ambient-fx { position: absolute; inset: 0; }
  `,
  headlineEase: 'power4.out',
  bodyEase: 'power2.out',
  energyLabel: 'METAL ENERGY · 金',
};

export const THEME_WATER: VideoTheme = {
  id: 'water',
  vars: {
    canvas: '#050A1F',
    surface: '#0E1838',
    border: '#1F2D5A',
    ink: '#E0E7FF',
    accent: '#60A5FA',
    accent2: '#A78BFA',
    chip: '#3D4A7A',
  },
  ambientHtml: `
    <div class="ambient-base"></div>
    <svg class="ambient-fx" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#60A5FA" stroke-width="1.5" fill="none" opacity="0.22">
        <path d="M -50 1100 Q 270 1050 540 1100 T 1130 1100" />
        <path d="M -50 1240 Q 270 1190 540 1240 T 1130 1240" />
        <path d="M -50 1380 Q 270 1330 540 1380 T 1130 1380" />
        <path d="M -50 1520 Q 270 1470 540 1520 T 1130 1520" />
      </g>
    </svg>
  `,
  ambientCss: `
    .ambient-base {
      position: absolute; inset: -10%;
      background:
        radial-gradient(ellipse at 30% 30%, rgba(96,165,250,0.20), transparent 55%),
        radial-gradient(ellipse at 75% 75%, rgba(167,139,250,0.12), transparent 60%);
    }
    .ambient-fx { position: absolute; inset: 0; opacity: 0.9; }
  `,
  headlineEase: 'sine.inOut',
  bodyEase: 'sine.out',
  energyLabel: 'WATER ENERGY · 水',
};

export const THEMES: Record<Element, VideoTheme> = {
  wood: THEME_WOOD,
  fire: THEME_FIRE,
  earth: THEME_EARTH,
  metal: THEME_METAL,
  water: THEME_WATER,
};

/**
 * Render a `:root { --canvas: ... }` block from a theme's vars.
 * Used by composition adapters to inject palette into HTML templates.
 */
export function themeRootCss(theme: VideoTheme): string {
  const { vars } = theme;
  return [
    ':root {',
    `  --canvas: ${vars.canvas};`,
    `  --surface: ${vars.surface};`,
    `  --border: ${vars.border};`,
    `  --ink: ${vars.ink};`,
    `  --accent: ${vars.accent};`,
    `  --accent2: ${vars.accent2};`,
    `  --chip: ${vars.chip};`,
    '}',
  ].join('\n');
}
