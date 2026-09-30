import type { Item } from '../ecs/world';

// Jewels that Lahap packs in bundles of 10, 20 or 30 (JewelMix of OpenMU).
// The index is the item type of LahapJewelMixRequest; the level of a
// bundle is 0, 1 or 2 for 10, 20 or 30 jewels.
export type JewelMix = {
  name: string;
  single: { group: number; num: number };
  packed: { group: number; num: number };
};

export const JEWEL_MIXES: JewelMix[] = [
  { name: 'Jewel of Bless', single: { group: 14, num: 13 }, packed: { group: 12, num: 30 } },
  { name: 'Jewel of Soul', single: { group: 14, num: 14 }, packed: { group: 12, num: 31 } },
  { name: 'Jewel of Life', single: { group: 14, num: 16 }, packed: { group: 12, num: 136 } },
  { name: 'Jewel of Creation', single: { group: 14, num: 22 }, packed: { group: 12, num: 137 } },
  { name: 'Jewel of Guardian', single: { group: 14, num: 31 }, packed: { group: 12, num: 138 } },
  { name: 'Gemstone', single: { group: 14, num: 41 }, packed: { group: 12, num: 139 } },
  { name: 'Jewel of Harmony', single: { group: 14, num: 42 }, packed: { group: 12, num: 140 } },
  { name: 'Jewel of Chaos', single: { group: 12, num: 15 }, packed: { group: 12, num: 141 } },
  { name: 'Lower refine stone', single: { group: 14, num: 43 }, packed: { group: 12, num: 142 } },
  { name: 'Higher refine stone', single: { group: 14, num: 44 }, packed: { group: 12, num: 143 } },
];

// fees of OpenMU (ItemStackAction)
export const PACK_FEE_PER_TEN = 500_000;
export const UNPACK_FEE = 1_000_000;

const is = (item: Item | null | undefined, ref: { group: number; num: number }) =>
  !!item && item.group === ref.group && item.num === ref.num;

export const isSingleJewel = (item: Item | null | undefined, mix: JewelMix) =>
  is(item, mix.single);

// type of a bundle, -1 when it isn't one
export const packedJewelType = (item: Item | null | undefined) =>
  JEWEL_MIXES.findIndex(mix => is(item, mix.packed));

export const packedJewelCount = (item: Item) => ((item.lvl ?? 0) + 1) * 10;
