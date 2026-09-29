import type { Item } from '../ecs/world';

const POTIONS_GROUP = 14;

// Item numbers of each hotkey kind, biggest potion first.
const HOTKEY_ITEMS = {
  Q: [3, 2, 1, 0], // large/medium/small healing potion, apple
  W: [6, 5, 4], // large/medium/small mana potion
  E: [8], // antidote
  R: [37, 36, 35], // large/medium/small shield potion
} as const;

export type ConsumableHotKey = keyof typeof HOTKEY_ITEMS;
export const CONSUMABLE_HOT_KEYS = Object.keys(
  HOTKEY_ITEMS
) as ConsumableHotKey[];

export function isConsumable(item: Item | null | undefined): item is Item {
  return (
    !!item &&
    item.group === POTIONS_GROUP &&
    Object.values(HOTKEY_ITEMS).some(nums =>
      (nums as readonly number[]).includes(item.num)
    )
  );
}

const SCROLLS_GROUP = 15; // wizard spells
const ORBS_GROUP = 12;
// orbs of skills (12/15 is the Jewel of Chaos, not an orb)
const SKILL_ORBS = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19];

// Items used with a right click in the inventory: potions and the scrolls /
// orbs that teach a skill.
export function isUsableFromInventory(
  item: Item | null | undefined
): item is Item {
  if (!item) return false;

  const teachesSkill =
    item.group === SCROLLS_GROUP ||
    (item.group === ORBS_GROUP && SKILL_ORBS.includes(item.num));

  return teachesSkill || isConsumable(item);
}

// Potion used by a hotkey: first slot of the preferred kind, plus the
// total amount of all potions of that hotkey (stack size is the durability).
export function findHotKeyItem(
  items: (Item | null)[],
  hotKey: ConsumableHotKey,
  firstSlot: number
) {
  const nums = HOTKEY_ITEMS[hotKey] as readonly number[];
  let slot = -1;
  let rank = Infinity;
  let count = 0;

  for (let i = firstSlot; i < items.length; i++) {
    const item = items[i];
    if (!item || item.group !== POTIONS_GROUP) continue;

    const r = nums.indexOf(item.num);
    if (r < 0) continue;

    count += item.durability || 1;
    if (r < rank) {
      rank = r;
      slot = i;
    }
  }

  return { slot, item: slot >= 0 ? items[slot] : null, count };
}
