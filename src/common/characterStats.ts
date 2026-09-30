import type { Item } from '../ecs/world';
import { CharacterClassNumber } from './types';
import { InventoryConstants } from './inventoryConstants';
import {
  itemAttackSpeed,
  itemDamage,
  itemDefense,
  itemDefenseRate,
  itemWizardryRise,
} from './itemInfo';

// Stats of the character window (C), computed like OpenMU does
// (Persistence/Initialization/CharacterClasses): the server doesn't send
// them. Buffs, excellent options and master skills are not included.

type BaseClass = 'DW' | 'DK' | 'ELF' | 'MG' | 'DL' | 'SUM';

function baseClass(cls: CharacterClassNumber | undefined): BaseClass {
  switch (cls) {
    case CharacterClassNumber.DarkWizard:
    case CharacterClassNumber.SoulMaster:
    case CharacterClassNumber.GrandMaster:
      return 'DW';
    case CharacterClassNumber.FairyElf:
    case CharacterClassNumber.MuseElf:
    case CharacterClassNumber.HighElf:
      return 'ELF';
    case CharacterClassNumber.MagicGladiator:
    case CharacterClassNumber.DuelMaster:
      return 'MG';
    case CharacterClassNumber.DarkLord:
    case CharacterClassNumber.LordEmperor:
      return 'DL';
    case CharacterClassNumber.Summoner:
    case CharacterClassNumber.BloodySummoner:
    case CharacterClassNumber.DimensionMaster:
      return 'SUM';
    default:
      return 'DK';
  }
}

export type StatPoints = {
  level: number;
  str: number;
  agi: number;
  vit: number;
  ene: number;
  // leadership (Dark Lord)
  cmd?: number;
};

export type CharacterStats = {
  damage: [number, number];
  attackRate: number;
  // Dark Wizard, Magic Gladiator and Summoner
  wizardryDamage?: [number, number];
  // % added by the staff
  wizardryRise?: number;
  defense: number;
  defenseRate: number;
  attackSpeed: number;
  magicSpeed: number;
};

const BOWS_GROUP = 4;
// arrows and bolts
const AMMUNITION = [7, 15];

const EQUIPMENT_SLOTS = [
  InventoryConstants.HelmSlot,
  InventoryConstants.ArmorSlot,
  InventoryConstants.PantsSlot,
  InventoryConstants.GlovesSlot,
  InventoryConstants.BootsSlot,
  InventoryConstants.WingsSlot,
];

// additional option of the jewel of life on weapons / armors (4 per level)
const optionBonus = (item: Item) => (item.optionLevel ?? 0) * 4;

export function computeCharacterStats(
  cls: CharacterClassNumber | undefined,
  p: StatPoints,
  items: (Item | null)[]
): CharacterStats {
  const base = baseClass(cls);
  const { level, str, agi, ene } = p;
  const cmd = p.cmd ?? 0;

  const hands = [
    items[InventoryConstants.LeftHandSlot],
    items[InventoryConstants.RightHandSlot],
  ].filter((i): i is Item => !!i);
  const weapons = hands.filter(
    w => itemDamage(w) && !(w.group === BOWS_GROUP && AMMUNITION.includes(w.num))
  );
  const hasBow = weapons.some(w => w.group === BOWS_GROUP);

  // damage of the stats
  let min = 0;
  let max = 0;
  switch (base) {
    case 'DK':
      [min, max] = [str / 6, str / 4];
      break;
    case 'DW':
      [min, max] = [str / 8, str / 4];
      break;
    case 'ELF':
      [min, max] = hasBow
        ? [agi / 7 + str / 14, agi / 4 + str / 8]
        : [(str + agi) / 7, (str + agi) / 4];
      break;
    case 'MG':
      [min, max] = [str / 6 + ene / 12, str / 4 + ene / 8];
      break;
    case 'DL':
      [min, max] = [str / 7 + ene / 14, str / 5 + ene / 10];
      break;
    case 'SUM':
      [min, max] = [(str + agi) / 7, (str + agi) / 4];
      break;
  }
  // and of the weapons
  for (const weapon of weapons) {
    const [wMin, wMax] = itemDamage(weapon)!;
    min += wMin + optionBonus(weapon);
    max += wMax + optionBonus(weapon);
  }

  const attackRate =
    base === 'DL'
      ? level * 5 + agi * 2.5 + str / 6 + cmd / 10
      : level * 5 + agi * 1.5 + str / 4;

  let wizardryDamage: [number, number] | undefined;
  let wizardryRise: number | undefined;
  if (base === 'DW' || base === 'MG' || base === 'SUM') {
    wizardryRise = Math.max(0, ...hands.map(itemWizardryRise));
    const multiplier = 1 + wizardryRise / 100;
    wizardryDamage = [
      Math.floor((ene / 9) * multiplier),
      Math.floor((ene / 4) * multiplier),
    ];
  }

  // defense: the stats and the equipment, halved (DefenseFinal of OpenMU)
  const DEFENSE_FACTOR = { DK: 1 / 3, DW: 1 / 4, ELF: 1 / 10, MG: 1 / 5, DL: 1 / 7, SUM: 1 / 3 };
  const armor = [...EQUIPMENT_SLOTS.map(s => items[s]), ...hands].filter(
    (i): i is Item => !!i
  );
  const itemsDefense = armor.reduce(
    (sum, item) => sum + itemDefense(item) + (itemDefense(item) ? optionBonus(item) : 0),
    0
  );
  const defense = Math.floor((agi * DEFENSE_FACTOR[base] + itemsDefense) * 0.5);

  const DEFENSE_RATE_FACTOR = { DK: 1 / 3, DW: 1 / 3, ELF: 1 / 4, MG: 1 / 3, DL: 1 / 7, SUM: 1 / 4 };
  const defenseRate = Math.floor(
    agi * DEFENSE_RATE_FACTOR[base] + armor.reduce((sum, i) => sum + itemDefenseRate(i), 0)
  );

  // speed: the stats and the weapons (half of each with two weapons)
  const SPEED = {
    DK: [1 / 15, 1 / 20],
    DW: [1 / 20, 1 / 10],
    ELF: [1 / 50, 1 / 50],
    MG: [1 / 15, 1 / 20],
    DL: [1 / 10, 1 / 10],
    SUM: [1 / 20, 1 / 20],
  } as const;
  const weaponSpeed =
    weapons.reduce((sum, w) => sum + itemAttackSpeed(w), 0) * (weapons.length > 1 ? 0.5 : 1);
  const attackSpeed = Math.floor(agi * SPEED[base][0] + weaponSpeed);
  const magicSpeed = Math.floor(agi * SPEED[base][1] + weaponSpeed);

  return {
    damage: [Math.floor(min), Math.floor(max)],
    attackRate: Math.floor(attackRate),
    wizardryDamage,
    wizardryRise,
    defense,
    defenseRate,
    attackSpeed,
    magicSpeed,
  };
}
