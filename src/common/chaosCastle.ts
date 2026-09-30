import type { Item } from '../ecs/world';
import { CharacterClassNumber } from './types';

// The monsters of Chaos Castle (162-173) are warriors with the look of a
// player, like in the original client: knights with a sword (even numbers)
// and elves with a bow (odd numbers), with better sets in the higher levels.

export const isChaosCastleWarrior = (type: number) =>
  type >= 162 && type <= 173;

const item = (group: number, num: number, lvl = 0): Item => ({
  group,
  num,
  lvl,
});

// sets of armor (the item number of the helm/armor/pants/gloves/boots)
const KNIGHT_SETS = [5, 0, 6, 8, 9, 1];
const ELF_SETS = [10, 11, 12, 13, 14, 14];
// Short Sword, Katana, Blade, Falchion, Serpent Sword, Legendary Sword
const SWORDS = [1, 3, 5, 7, 8, 11];
// Short Bow, Bow, Elven Bow, Battle Bow, Tiger Bow, Silver Bow
const BOWS = [0, 1, 2, 3, 4, 5];

export function chaosCastleWarrior(type: number) {
  const tier = Math.floor((type - 162) / 2);
  const knight = (type - 162) % 2 === 0;
  const set = (knight ? KNIGHT_SETS : ELF_SETS)[tier];
  const lvl = tier * 2;
  return {
    charClass: knight
      ? CharacterClassNumber.DarkKnight
      : CharacterClassNumber.FairyElf,
    helm: item(7, set, lvl),
    armor: item(8, set, lvl),
    pants: item(9, set, lvl),
    gloves: item(10, set, lvl),
    boots: item(11, set, lvl),
    leftHand: knight ? item(0, SWORDS[tier], lvl) : item(4, 15),
    rightHand: knight ? null : item(4, BOWS[tier], lvl),
  };
}

// The floor that falls in each stage (StartX, StartY, EndX, EndY): OpenMU
// doesn't send these changes, the client knows them like the original one.
export const CHAOS_CASTLE_FALLING_FLOOR: [number, number, number, number][][] =
  [
    [
      [0x17, 0x4b, 0x2c, 0x4c],
      [0x2b, 0x4d, 0x2c, 0x6c],
      [0x17, 0x6b, 0x2a, 0x6c],
      [0x17, 0x4d, 0x18, 0x6a],
    ],
    [
      [0x19, 0x4d, 0x2a, 0x4e],
      [0x29, 0x4f, 0x2a, 0x6a],
      [0x19, 0x69, 0x28, 0x6a],
      [0x19, 0x4f, 0x1a, 0x68],
    ],
    [
      [0x1b, 0x4f, 0x28, 0x50],
      [0x27, 0x51, 0x28, 0x68],
      [0x1b, 0x67, 0x26, 0x68],
      [0x1b, 0x51, 0x1c, 0x66],
    ],
  ];
