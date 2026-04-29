/**
 * 12 zodiac → 5 element mapping (saju Earth Branches → 五行).
 * Used to drive theme selection so each sign's video has element-appropriate
 * visual language (Tiger = Wood = green ink, Horse = Fire = ember pulse, etc).
 */

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const ZODIAC_ELEMENT: Record<string, Element> = {
  Rat: 'water',
  Ox: 'earth',
  Tiger: 'wood',
  Rabbit: 'wood',
  Dragon: 'earth',
  Snake: 'fire',
  Horse: 'fire',
  Sheep: 'earth',
  Monkey: 'metal',
  Rooster: 'metal',
  Dog: 'earth',
  Pig: 'water',
};

export function elementFor(animal: string): Element {
  return ZODIAC_ELEMENT[animal] ?? 'wood';
}
