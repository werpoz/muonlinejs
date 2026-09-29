import type { Item } from '../ecs/world';
import { ItemsDatabase } from './itemsDatabase';
import { SKILLS } from './skills';

// Texts of the item tooltip, with the values OpenMU uses
// (Persistence/Initialization: Weapons.cs, ArmorInitializerBase.cs,
// ExcellentOptions.cs and GameLogic/ItemExtensions.cs).

export type TooltipLineKind =
  | 'normal'
  | 'option'
  | 'excellent'
  | 'skill'
  | 'missing'
  | 'info';

export type TooltipLine = { text: string; kind: TooltipLineKind };

export type ItemTooltip = {
  name: string;
  nameKind: 'normal' | 'upgraded' | 'high' | 'excellent' | 'ancient';
  lines: TooltipLine[];
};

// player values to check the requirements
export type PlayerStats = {
  level: number;
  str: number;
  agi: number;
  vit: number;
  ene: number;
};

// bonus per item level (0-15)
const DAMAGE_BY_LEVEL = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 31, 36, 42, 49, 57, 66];
const DEFENSE_BY_LEVEL = DAMAGE_BY_LEVEL;
const SHIELD_DEFENSE_BY_LEVEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const DURABILITY_BY_LEVEL = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 17, 21, 26, 32, 39, 47];
const STAFF_RISE_EVEN = [0, 3, 7, 10, 14, 17, 21, 24, 28, 31, 35, 40, 45, 50, 56, 63];
const STAFF_RISE_ODD = [0, 4, 7, 11, 14, 18, 21, 25, 28, 32, 36, 40, 45, 51, 57, 63];

// excellent options, bit 0 is option number 1
const EXCELLENT_WEAPON = [
  'Increase Mana after monster kill +Mana/8',
  'Increase Life after monster kill +Life/8',
  'Increase attacking (wizardry) speed +7',
  'Increase Damage +2%',
  'Increase Damage +level/20',
  'Excellent Damage rate +10%',
];
const EXCELLENT_ARMOR = [
  'Increase Zen after hunt +40%',
  'Defense success rate +10%',
  'Reflect damage +5%',
  'Damage Decrease +4%',
  'Increase Max Mana +4%',
  'Increase Max HP +4%',
];

const CLASSES: [string, string][] = [
  ['DW/SM', 'Dark Wizard'],
  ['DK/BK', 'Dark Knight'],
  ['Elf/ME', 'Fairy Elf'],
  ['MG', 'Magic Gladiator'],
  ['DL', 'Dark Lord'],
  ['SUM', 'Summoner'],
];

// skills of items which are not in SKILLS (pets)
const ITEM_SKILL_NAMES: Record<number, string> = {
  49: 'Fire Breath',
  62: 'Earthshake',
  76: 'Plasma Storm',
};

const WEAPON_GROUPS = [0, 1, 2, 3, 4, 5];
const STAFF_GROUP = 5;
const SHIELD_GROUP = 6;
const ARMOR_GROUPS = [7, 8, 9, 10, 11];
const WINGS_GROUP = 12;
const JEWELRY_GROUP = 13;
const POTIONS_GROUP = 14;

type ItemConfig = Record<string, number | string | undefined>;

const num = (config: ItemConfig, ...keys: string[]) => {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === 'number') return value;
  }
  return 0;
};

const byLevel = (table: number[], level: number) =>
  table[Math.min(Math.max(level, 0), table.length - 1)];

export function isWearable(group: number) {
  return group <= WINGS_GROUP || group === JEWELRY_GROUP;
}

// Jewel of Bless / Soul / Life: used on another inventory item
export const UPGRADE_JEWELS: Record<string, string> = {
  '14/13': 'Jewel of Bless',
  '14/14': 'Jewel of Soul',
  '14/16': 'Jewel of Life',
};

export const isUpgradeJewel = (item: Item | null | undefined) =>
  !!item && `${item.group}/${item.num}` in UPGRADE_JEWELS;

// the level of a fruit is the stat it adds
const FRUIT = '13/15';
const FRUIT_STATS = ['Energy', 'Vitality', 'Agility', 'Strength', 'Command'];

export function getItemName(item: Item) {
  const config = ItemsDatabase.getItem(item.group, item.num);
  const name = config?.ItemName ?? `Item ${item.group}/${item.num}`;
  if (`${item.group}/${item.num}` === FRUIT) {
    return `${name} (${FRUIT_STATS[item.lvl ?? 0] ?? item.lvl})`;
  }
  const prefix = item.isAncient ? 'Ancient ' : item.isExcellent ? 'Excellent ' : '';
  const level = item.lvl && isWearable(item.group) ? ` +${item.lvl}` : '';
  return prefix + name + level;
}

// additional option of the jewel of life, 4 points per level
function additionalOption(item: Item): string | null {
  const level = item.optionLevel ?? 0;
  if (!level) return null;

  if (item.group === STAFF_GROUP) return `Additional Wizardry Dmg +${level * 4}`;
  if (WEAPON_GROUPS.includes(item.group)) return `Additional Dmg +${level * 4}`;
  if (item.group === SHIELD_GROUP) return `Additional Defense rate +${level * 5}`;
  if (ARMOR_GROUPS.includes(item.group)) return `Additional Defense +${level * 4}`;
  if (item.group === JEWELRY_GROUP) return `Automatic HP recovery +${level}%`;
  return `Additional option +${level * 4}`;
}

// requirement of OpenMU: multiplier * dropLevel * base / 100 + 20
function requirement(
  base: number,
  dropLevel: number,
  multiplier: number
): number {
  return base ? Math.floor((multiplier * dropLevel * base) / 100) + 20 : 0;
}

export function getItemTooltip(item: Item, player?: PlayerStats): ItemTooltip {
  const config = (ItemsDatabase.getItem(item.group, item.num) ??
    {}) as ItemConfig;
  const level = item.lvl ?? 0;
  const lines: TooltipLine[] = [];
  const add = (text: string, kind: TooltipLineKind = 'normal') =>
    lines.push({ text, kind });

  const nameKind: ItemTooltip['nameKind'] = item.isAncient
    ? 'ancient'
    : item.isExcellent
      ? 'excellent'
      : level >= 7
        ? 'high'
        : level >= 4
          ? 'upgraded'
          : 'normal';

  // stackable items (potions, jewels...): the durability is the amount
  if (!isWearable(item.group)) {
    if ((item.durability ?? 0) > 1) add(`Quantity: ${item.durability}`);
    if (isUpgradeJewel(item)) {
      add('Pick it up and click an item of the inventory to use it', 'info');
    } else if (item.group === POTIONS_GROUP) {
      add('Right click to use it', 'info');
    }
    return { name: getItemName(item), nameKind, lines };
  }

  const isWeapon = WEAPON_GROUPS.includes(item.group);

  if (isWeapon) {
    const bonus = byLevel(DAMAGE_BY_LEVEL, level);
    const hands = num(config, 'X') >= 2 ? 'Two-handed' : 'One-handed';
    const min = num(config, 'DmgMin');
    const max = num(config, 'DmgMax');
    if (max) add(`${hands} Damage: ${min + bonus} ~ ${max + bonus}`);

    const magicPower = num(config, 'MagicPwr');
    if (magicPower) {
      const rise = byLevel(magicPower % 2 ? STAFF_RISE_ODD : STAFF_RISE_EVEN, level);
      add(`Wizardry Dmg rise: ${Math.floor((magicPower + rise) / 2)}%`);
    }
    const speed = num(config, 'Speed');
    if (speed) add(`Attack speed: ${speed}`);
  }

  if (item.group === SHIELD_GROUP || ARMOR_GROUPS.includes(item.group)) {
    const table = item.group === SHIELD_GROUP ? SHIELD_DEFENSE_BY_LEVEL : DEFENSE_BY_LEVEL;
    const defense = num(config, 'Def');
    if (defense) add(`Defense: ${defense + byLevel(table, level)}`);

    const defenseRate = num(config, 'DefRate');
    if (defenseRate) {
      add(`Defense rate: ${defenseRate + byLevel(DEFENSE_BY_LEVEL, level)}`);
    }
  }

  if (item.group === WINGS_GROUP) {
    const defense = num(config, 'Def');
    if (defense) add(`Defense: ${defense}`);
  }

  const baseDurability = num(config, 'Durability', 'Dur');
  if (baseDurability) {
    const maxDurability = baseDurability + byLevel(DURABILITY_BY_LEVEL, level);
    add(`Durability: [${item.durability ?? maxDurability}/${maxDurability}]`);
  }

  // requirements
  const dropLevel =
    num(config, 'ItemLvl', 'Lvl') +
    (item.isAncient ? 30 : item.isExcellent ? 25 : 0) +
    3 * level;
  const requiredLevel = num(config, 'RequiredLvl', 'ReqLvl');
  const requirements: [string, number, number | undefined][] = [
    ['Level', requiredLevel, player?.level],
    [
      'Strength',
      requirement(num(config, 'Strength', 'Str'), dropLevel, 3) +
        (item.optionLevel ?? 0) * 4 * (num(config, 'Strength', 'Str') ? 1 : 0),
      player?.str,
    ],
    ['Agility', requirement(num(config, 'Agi'), dropLevel, 3), player?.agi],
    ['Vitality', requirement(num(config, 'Vit'), dropLevel, 3), player?.vit],
    ['Energy', requirement(num(config, 'Ene'), dropLevel, 4), player?.ene],
  ];
  for (const [label, value, current] of requirements) {
    if (!value) continue;
    const missing = current != null && current < value;
    add(`${label} requirement: ${value}`, missing ? 'missing' : 'normal');
  }

  const classes = CLASSES.filter(([key]) => num(config, key) > 0).map(
    ([, name]) => name
  );
  if (classes.length && classes.length < CLASSES.length) {
    add(`Can be equipped by ${classes.join(', ')}`, 'info');
  }

  // options
  const skill = num(config, 'Skill');
  if (item.hasSkill && skill) {
    const skillName = SKILLS[skill]?.name ?? ITEM_SKILL_NAMES[skill];
    add(skillName ? `${skillName} skill` : 'Skill', 'skill');
  }
  if (item.hasLuck) {
    add('Luck (success rate of Jewel of Soul +25%)', 'option');
    add('Luck (critical damage rate +5%)', 'option');
  }
  const option = additionalOption(item);
  if (option) add(option, 'option');

  if (item.isExcellent) {
    const names = isWeapon ? EXCELLENT_WEAPON : EXCELLENT_ARMOR;
    names.forEach((text, bit) => {
      if ((item.excellentOptions ?? 0) & (1 << bit)) add(text, 'excellent');
    });
  }

  return { name: getItemName(item), nameKind, lines };
}
