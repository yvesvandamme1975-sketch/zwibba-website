import type { FashionItemType } from './fashion-attributes';

export type JewelryItemType = Extract<
  FashionItemType,
  'jewelry_ring' | 'jewelry_earrings' | 'jewelry_necklace' | 'jewelry_bracelet' | 'jewelry_watch'
>;

interface JewelryPattern {
  itemType: JewelryItemType;
  patterns: RegExp[];
}

const jewelryPatterns: JewelryPattern[] = [
  { itemType: 'jewelry_ring', patterns: [/\bbagues?\b/, /\balliances?\b/, /\brings?\b/] },
  {
    itemType: 'jewelry_earrings',
    patterns: [
      /\bboucles?\s+d[’']?\s*oreilles?\b/,
      /\bpuces?\s+d[’']?\s*oreilles?\b/,
      /\bearrings?\b/,
    ],
  },
  {
    itemType: 'jewelry_necklace',
    patterns: [
      /\bcolliers?\b/,
      /\bpendentifs?\b/,
      /\bchaines?\b/,
      /\bsautoirs?\b/,
      /\bnecklaces?\b/,
    ],
  },
  {
    itemType: 'jewelry_bracelet',
    patterns: [/\bbracelets?\b/, /\bgourmettes?\b/, /\bjoncs?\b/, /\bmanchettes?\b/],
  },
  { itemType: 'jewelry_watch', patterns: [/\bmontres?\b/, /\bwatches?\b/] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function detectJewelryItemTypeFromText(text: string): JewelryItemType | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalized = normalize(text);
  const matches = new Set<JewelryItemType>();

  for (const { itemType, patterns } of jewelryPatterns) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      matches.add(itemType);
    }
  }

  if (matches.size !== 1) {
    return null;
  }

  return matches.values().next().value as JewelryItemType;
}
