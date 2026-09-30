import type { Item } from '../ecs/world';
import { CharacterClassNumber as C } from './types';

// Devil Square and Blood Castle as OpenMU defines them (MiniGameDefinition):
// levels, character levels (special ones for Magic Gladiator and Dark Lord),
// ticket items and maps.

export type MiniGameKind = 'DevilSquare' | 'BloodCastle';

// MiniGameType of the protocol
export const MINI_GAME_TYPE: Record<MiniGameKind, number> = {
  DevilSquare: 1,
  BloodCastle: 2,
};

export type MiniGameLevel = {
  level: number;
  min: number;
  max: number;
  // Magic Gladiator, Dark Lord
  specialMin: number;
  specialMax: number;
  // needs a third class (the last level)
  masterClass?: boolean;
  map: number;
};

type MiniGameInfo = {
  name: string;
  ticket: { group: number; num: number; name: string };
  levels: MiniGameLevel[];
  // minutes of a game
  duration: number;
};

const level = (
  level: number,
  min: number,
  max: number,
  specialMin: number,
  specialMax: number,
  map: number,
  masterClass = false
): MiniGameLevel => ({ level, min, max, specialMin, specialMax, map, masterClass });

export const MINI_GAMES: Record<MiniGameKind, MiniGameInfo> = {
  DevilSquare: {
    name: 'Devil Square',
    ticket: { group: 14, num: 19, name: "Devil's Invitation" },
    duration: 20,
    levels: [
      level(1, 15, 130, 10, 110, 9),
      level(2, 131, 180, 111, 160, 9),
      level(3, 181, 230, 161, 210, 9),
      level(4, 231, 280, 211, 260, 9),
      level(5, 281, 330, 261, 310, 32),
      level(6, 331, 400, 311, 400, 32),
      level(7, 0, 400, 0, 400, 32, true),
    ],
  },
  BloodCastle: {
    name: 'Blood Castle',
    ticket: { group: 13, num: 18, name: 'Invisibility Cloak' },
    duration: 20,
    levels: [
      level(1, 15, 80, 10, 60, 11),
      level(2, 81, 130, 61, 110, 12),
      level(3, 131, 180, 111, 160, 13),
      level(4, 181, 230, 161, 210, 14),
      level(5, 231, 280, 211, 260, 15),
      level(6, 281, 330, 261, 310, 16),
      level(7, 331, 400, 311, 400, 17),
      level(8, 331, 400, 0, 400, 52, true),
    ],
  },
};

const SPECIAL_CLASSES = [C.MagicGladiator, C.DuelMaster, C.DarkLord, C.LordEmperor];
const MASTER_CLASSES = [
  C.GrandMaster,
  C.BladeMaster,
  C.HighElf,
  C.DuelMaster,
  C.LordEmperor,
  C.DimensionMaster,
];

export const isSpecialClass = (cls: C | undefined) =>
  cls !== undefined && SPECIAL_CLASSES.includes(cls);

export const levelRange = (l: MiniGameLevel, cls: C | undefined) =>
  isSpecialClass(cls) ? [l.specialMin, l.specialMax] : [l.min, l.max];

export function canEnterLevel(l: MiniGameLevel, cls: C | undefined, characterLevel: number) {
  if (l.masterClass && !(cls !== undefined && MASTER_CLASSES.includes(cls))) return false;
  const [min, max] = levelRange(l, cls);
  return characterLevel >= min && characterLevel <= max;
}

// the level of the game for the character (the first one that fits)
export const suitableLevel = (kind: MiniGameKind, cls: C | undefined, characterLevel: number) =>
  MINI_GAMES[kind].levels.find(l => canEnterLevel(l, cls, characterLevel));

// tickets of the inventory by the level of the game (the item level)
export function ticketsOf(kind: MiniGameKind, items: (Item | null)[], firstSlot: number) {
  const { ticket } = MINI_GAMES[kind];
  const result: { slot: number; level: number }[] = [];
  items.forEach((item, slot) => {
    if (slot < firstSlot || !item) return;
    if (item.group === ticket.group && item.num === ticket.num) {
      result.push({ slot, level: item.lvl ?? 0 });
    }
  });
  return result;
}

const EVENT_MAPS = new Set(
  Object.values(MINI_GAMES).flatMap(g => g.levels.map(l => l.map))
);

export const isMiniGameMap = (map: number) => EVENT_MAPS.has(map);
