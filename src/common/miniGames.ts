import type { Item } from '../ecs/world';
import { CharacterClassNumber as C } from './types';

// Devil Square, Blood Castle and Chaos Castle as OpenMU defines them
// (MiniGameDefinition): levels, character levels (special ones for Magic
// Gladiator and Dark Lord), ticket items, entrance fees and maps.

export type MiniGameKind = 'DevilSquare' | 'BloodCastle' | 'ChaosCastle';

// MiniGameType of the protocol
export const MINI_GAME_TYPE: Record<MiniGameKind, number> = {
  DevilSquare: 1,
  BloodCastle: 2,
  ChaosCastle: 4,
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
  // zen taken when entering
  fee?: number;
};

type MiniGameInfo = {
  name: string;
  ticket: { group: number; num: number; name: string };
  levels: MiniGameLevel[];
  // minutes of a game
  duration: number;
  // level of the ticket for every level of the game (Chaos Castle: one
  // Armor of Guardsman for all); the level of the game when missing
  ticketLevel?: number;
};

const level = (
  level: number,
  min: number,
  max: number,
  specialMin: number,
  specialMax: number,
  map: number,
  masterClass = false,
  fee?: number
): MiniGameLevel => ({ level, min, max, specialMin, specialMax, map, masterClass, fee });

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
  ChaosCastle: {
    name: 'Chaos Castle',
    ticket: { group: 13, num: 29, name: 'Armor of Guardsman' },
    duration: 10,
    ticketLevel: 0,
    levels: [
      level(1, 15, 49, 15, 29, 18, false, 25_000),
      level(2, 50, 119, 30, 99, 19, false, 80_000),
      level(3, 120, 179, 100, 159, 20, false, 150_000),
      level(4, 180, 239, 160, 219, 21, false, 250_000),
      level(5, 240, 299, 220, 279, 22, false, 400_000),
      level(6, 300, 400, 280, 400, 23, false, 650_000),
      level(7, 400, 400, 400, 400, 53, true, 1_000_000),
    ],
  },
};

// the game of an event map
export const miniGameOfMap = (map: number) => {
  for (const [kind, game] of Object.entries(MINI_GAMES) as [MiniGameKind, MiniGameInfo][]) {
    const l = game.levels.find(l => l.map === map);
    if (l) return { kind, level: l.level };
  }
  return undefined;
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
