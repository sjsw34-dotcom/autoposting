/**
 * Preview which (layout, theme, zodiac) combination would be picked for each
 * of the next N days — without rendering. Fast sanity check that the
 * deterministic rotation produces variety.
 *
 * Run: npx tsx scripts/video/preview-variations.ts
 *      npx tsx scripts/video/preview-variations.ts --days=30
 */
import { generateZodiacFortune } from '../../lib/content/zodiac-fortune';
import { pickZodiacVariation } from '../../lib/video/variation-selector';

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

const daysArg = process.argv.find((a) => a.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 14;

const today = new Date();
const combos = new Set<string>();
const consecutivePairs = new Set<string>();
let prevKey: string | null = null;

console.log(`Preview of next ${days} days:\n`);
console.log('Day  Date       Zodiac    Element  Layout    Combo');
console.log('---  ---------  --------  -------  --------  -----');

for (let i = 0; i < days; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  const fortune = generateZodiacFortune(d);
  const featured = fortune.signs[dayOfYear(d) % fortune.signs.length];
  const variation = pickZodiacVariation(d, featured.animal);
  const key = `${variation.layout.id}/${variation.theme.id}`;
  combos.add(key);
  if (prevKey) consecutivePairs.add(`${prevKey} → ${key}`);
  prevKey = key;

  console.log(
    `+${String(i).padStart(2, '0')}  ${d.toISOString().slice(0, 10)}  ${featured.animal.padEnd(8)}  ${variation.theme.id.padEnd(7)}  ${variation.layout.id.padEnd(8)}  ${key}`
  );
}

console.log(`\n${combos.size} distinct (layout × element) combinations across ${days} days`);
console.log(`${consecutivePairs.size} distinct day-to-day transitions (higher = less repetition)`);
