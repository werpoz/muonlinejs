import type { Item } from '../ecs/world';
import { CharacterClassNumber as C } from './types';

// Quests of the legacy quest system (the class changes of season 6), with
// the requirements and rewards of OpenMU (Persistence/Initialization).
// The server sends only the quest number and its state: the texts are ours.

export enum LegacyQuestState {
  Undefined = 0,
  Active = 1,
  Complete = 2,
  Inactive = 3,
}

type QuestItem = { group: number; num: number; lvl: number; name: string };
type QuestKill = { monster: number; name: string; count: number };

export type LegacyQuest = {
  number: number;
  name: string;
  npc: string;
  level: number;
  money: number;
  // classes that can do it (all when missing)
  classes?: C[];
  items?: Partial<Record<C, QuestItem[]>> | QuestItem[];
  kills?: QuestKill[];
  rewards: string[];
  // what the NPC tells about it
  text: string;
  // where the items come from
  hint: string;
};

const FIRST_CLASSES = [C.DarkWizard, C.DarkKnight, C.FairyElf, C.Summoner];
const SECOND_CLASSES = [C.SoulMaster, C.BladeKnight, C.MuseElf, C.BloodySummoner];

const item = (num: number, name: string, lvl = 0): QuestItem => ({ group: 14, num, lvl, name });

const SCROLL_OF_EMPEROR = item(23, 'Scroll of Emperor');
const RING_OF_HONOR = item(23, 'Ring of Honor', 1);

export const LEGACY_QUESTS: LegacyQuest[] = [
  {
    number: 0,
    name: "Find the 'Scroll of Emperor'",
    npc: 'Sevina the Priestess',
    level: 150,
    money: 1_000_000,
    classes: FIRST_CLASSES,
    items: [SCROLL_OF_EMPEROR],
    rewards: ['10 level up points'],
    text: 'The Scroll of Emperor was lost when the demons attacked. Bring it back to me and I will teach you a secret of the ancient warriors.',
    hint: 'Monsters of level 45 to 60 may drop it while the quest is active.',
  },
  {
    number: 1,
    name: 'Treasures of MU',
    npc: 'Sevina the Priestess',
    level: 150,
    money: 2_000_000,
    classes: FIRST_CLASSES,
    items: {
      [C.DarkKnight]: [item(24, 'Broken Sword')],
      [C.DarkWizard]: [item(26, 'Soul Shard of Wizard')],
      [C.FairyElf]: [item(25, 'Tear of Elf')],
      [C.Summoner]: [item(68, 'Eye of Abyssal')],
    },
    rewards: ['10 level up points', 'Change to the second class'],
    text: 'Only those who recover a treasure of their ancestors can reach the next level of power. Find it and I will awaken your true strength.',
    hint: 'Monsters of level 62 to 76 may drop it while the quest is active.',
  },
  {
    number: 2,
    name: 'Gain Hero Status',
    npc: 'Marlon',
    level: 220,
    money: 3_000_000,
    classes: SECOND_CLASSES,
    items: [RING_OF_HONOR],
    rewards: ['1 more level up point per level', 'Infinity Arrow (Muse Elf)'],
    text: 'A true hero carries the Ring of Honor. Bring it to me and the people of MU will recognize you as one of their heroes.',
    hint: 'Monsters of level 72 to 108 may drop it while the quest is active.',
  },
  {
    number: 3,
    name: "Secret of the 'Dark Stone'",
    npc: 'Marlon',
    level: 220,
    money: 2_000_000,
    classes: [C.BladeKnight],
    items: [item(24, 'Dark Stone', 1)],
    rewards: ['Combo skill'],
    text: 'The Dark Stone hides the secret of chaining your skills. Bring it to me and I will teach you the combo.',
    hint: 'Monsters of level 78 to 108 may drop it while the quest is active.',
  },
  {
    number: 4,
    name: 'Evidence of Strength',
    npc: 'Priest Devin',
    level: 380,
    money: 5_000_000,
    items: [
      item(65, 'Flame of Death Beam Knight'),
      item(66, 'Horn of Hell Maine'),
      item(67, 'Feather of Dark Phoenix'),
    ],
    rewards: ['20 level up points'],
    text: 'To reach the highest class you must prove your strength. Defeat the Death Beam Knight, Hell Maine and the Dark Phoenix and bring me their trophies.',
    hint: 'Death Beam Knight, Hell Maine and Dark Phoenix drop them.',
  },
  {
    number: 5,
    name: 'Infiltrate The Barracks of Balgass',
    npc: 'Priest Devin',
    level: 400,
    money: 7_000_000,
    kills: [
      { monster: 409, name: 'Balram (Trainee Soldier)', count: 20 },
      { monster: 410, name: 'Death Spirit (Trainee Soldier)', count: 20 },
      { monster: 411, name: 'Soram (Trainee Soldier)', count: 20 },
    ],
    rewards: ['10 level up points'],
    text: 'Balgass trains his army in the barracks. Get in and weaken it.',
    hint: 'The barracks are entered from Priest Devin once the quest is active.',
  },
  {
    number: 6,
    name: "Into the 'Darkness' Zone",
    npc: 'Priest Devin',
    level: 400,
    money: 10_000_000,
    kills: [{ monster: 412, name: 'Dark Elf (Trainee Soldier)', count: 1 }],
    rewards: ['30 level up points', 'Change to the third class'],
    text: 'The last test waits in the refuge of Balgass. Defeat the Dark Elf that guards it.',
    hint: 'The refuge is entered from the barracks of Balgass.',
  },
];

export const legacyQuest = (number: number) => LEGACY_QUESTS.find(q => q.number === number);

export function questItemsFor(quest: LegacyQuest, cls: C | undefined): QuestItem[] {
  if (!quest.items) return [];
  if (Array.isArray(quest.items)) return quest.items;
  return (cls !== undefined && quest.items[cls]) || [];
}

export const canDoQuest = (quest: LegacyQuest, cls: C | undefined) =>
  !quest.classes || (cls !== undefined && quest.classes.includes(cls));

// state of a quest in a state byte (2 bits per quest, 4 quests per byte)
export const questStateIn = (stateByte: number, questNumber: number): LegacyQuestState =>
  (stateByte >> ((questNumber % 4) * 2)) & 3;

export const hasQuestItem = (items: (Item | null)[], required: QuestItem) =>
  items.some(
    i => i && i.group === required.group && i.num === required.num && (i.lvl ?? 0) === required.lvl
  );

// 'BladeKnight' -> 'Blade Knight'
export const classDisplayName = (cls: C | undefined) =>
  cls === undefined ? '' : (C[cls] ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');

// class after a class change reward of the quests
export const classAfterQuest = (count: number): C => (count >> 3) as C;
