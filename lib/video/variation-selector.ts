import { THEMES, type VideoTheme } from './themes';
import { elementFor } from './zodiac-elements';

/**
 * Composition layout variants. Each is a separate HTML template that lives
 * under video/compositions/. Adding a new variant: drop a new file, add it
 * here, ship.
 */
export const ZODIAC_LAYOUTS = [
  { id: 'center', file: 'zodiac-fortune.html', durationSec: 25 },
  { id: 'split', file: 'zodiac-split.html', durationSec: 25 },
  { id: 'kinetic', file: 'zodiac-kinetic.html', durationSec: 22 },
] as const;

export type LayoutId = (typeof ZODIAC_LAYOUTS)[number]['id'];

export interface VariationChoice {
  layout: (typeof ZODIAC_LAYOUTS)[number];
  theme: VideoTheme;
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

/**
 * Pick a variation for the day. Layout rotates day-by-day so consecutive
 * days never use the same template. Theme follows the featured zodiac's
 * native saju element (Tiger=Wood, Horse=Fire, ...) — that's the main
 * source of palette/ambient variety. Combined: 3 layouts × 5 elements =
 * 15 distinct visual feels per zodiac cycle.
 */
export function pickZodiacVariation(date: Date, featuredAnimal: string): VariationChoice {
  const doy = dayOfYear(date);
  const layout = ZODIAC_LAYOUTS[doy % ZODIAC_LAYOUTS.length];
  const theme = THEMES[elementFor(featuredAnimal)];
  return { layout, theme };
}

/**
 * Insight-style content (wealth/love/career/insight). Element comes from
 * the content category itself rather than a zodiac. Layout still rotates
 * day-by-day so even the same category won't render identically two days
 * apart.
 */
export const INSIGHT_LAYOUTS = [
  { id: 'card', file: 'saju-insight.html', durationSec: 20 },
  { id: 'kinetic', file: 'insight-kinetic.html', durationSec: 18 },
] as const;

const CATEGORY_ELEMENT: Record<string, ReturnType<typeof elementFor>> = {
  WEALTH: 'metal',
  LOVE: 'fire',
  CAREER: 'earth',
  INSIGHT: 'water',
};

export function pickInsightVariation(
  date: Date,
  category: string
): { layout: (typeof INSIGHT_LAYOUTS)[number]; theme: VideoTheme } {
  const doy = dayOfYear(date);
  const layout = INSIGHT_LAYOUTS[doy % INSIGHT_LAYOUTS.length];
  const elementId = CATEGORY_ELEMENT[category.toUpperCase()] ?? 'wood';
  const theme = THEMES[elementId];
  return { layout, theme };
}
