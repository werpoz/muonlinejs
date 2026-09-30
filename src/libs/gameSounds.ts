import { CharacterClassNumber } from '../common/types';
import monsterSounds from '../common/monsterSounds.json';
import skillSounds from '../common/skillSounds.json';
import type { Entity } from '../ecs/world';
import { LocalStorage } from './localStorage';
import { Sounds, SoundsManager } from './soundsManager';
import { modelTypeOf } from '../common/monsterModelAliases';
import { Store } from '../store';

// Sound effects of the game: attenuated by the distance to the player, like
// PlayBufferWithAttenuation of the original client.

// farther than this (tiles) a sound is not heard
const HEARING_DISTANCE = 16;

const random = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

// volume by the distance from the player to (x, y)
function attenuation(x: number, y: number): number {
  const me = Store.world?.playerEntity;
  if (!me) return 1;
  const distance = Math.hypot(me.transform.pos.x - x, me.transform.pos.z - y);
  return Math.max(0, 1 - distance / HEARING_DISTANCE);
}

export function playSound(
  key: Sounds,
  options: { at?: { x: number; y: number }; volume?: number; rate?: number } = {}
) {
  if (!SoundsManager.pageInteracted || !SoundsManager.scene) return;

  let volume = options.volume ?? 1;
  if (options.at) volume *= attenuation(options.at.x, options.at.y);
  if (volume <= 0.01) return;

  const sound = SoundsManager.loadAndPlaySoundEffect(key);
  if (!sound) return;
  sound.setVolume(volume);
  sound.setPlaybackRate(options.rate ?? 1);
}

const positionOf = (e: Entity) =>
  e.transform ? { x: e.transform.pos.x, y: e.transform.pos.z } : undefined;

// monster events of monsterSounds.json (from the monster number)
type MonsterEvent = 'idle' | 'attack' | 'death' | 'damage';

export function playMonsterSound(monster: Entity, event: MonsterEvent) {
  const sounds = (monsterSounds as Record<string, Partial<Record<MonsterEvent, string[]>>>)[
    String(modelTypeOf(monster.npcType ?? -1))
  ];
  const list = sounds?.[event];
  if (!list?.length) return;
  playSound(random(list) as Sounds, { at: positionOf(monster) });
}

export function hasMonsterSound(monster: Entity, event: MonsterEvent) {
  const sounds = (monsterSounds as Record<string, Partial<Record<MonsterEvent, string[]>>>)[
    String(modelTypeOf(monster.npcType ?? -1))
  ];
  return !!sounds?.[event]?.length;
}

export function playSkillSound(skill: number, caster?: Entity) {
  const key = (skillSounds as Record<string, string>)[String(skill)];
  if (key) playSound(key as Sounds, { at: caster && positionOf(caster) });
}

const FEMALE_CLASSES = [
  CharacterClassNumber.FairyElf,
  CharacterClassNumber.MuseElf,
  CharacterClassNumber.HighElf,
  CharacterClassNumber.Summoner,
  CharacterClassNumber.BloodySummoner,
  CharacterClassNumber.DimensionMaster,
];

const isFemale = (player: Entity) =>
  FEMALE_CLASSES.includes(player.charAppearance?.charClass as CharacterClassNumber);

// a player gets hit / dies
export function playPlayerHurt(player: Entity) {
  const key: Sounds = isFemale(player)
    ? random(['Sound/pFemaleScream1', 'Sound/pFemaleScream2'] as const)
    : random(['Sound/pMaleScream1', 'Sound/pMaleScream2', 'Sound/pMaleScream3'] as const);
  playSound(key, { at: positionOf(player) });
}

export function playPlayerDeath(player: Entity) {
  playSound(isFemale(player) ? 'Sound/pFemaleScream2' : 'Sound/pMaleDie', {
    at: positionOf(player),
  });
}

// a weapon hits something
export function playHitSound(target: Entity) {
  const key = random([
    'Sound/eMeleeHit1',
    'Sound/eMeleeHit2',
    'Sound/eMeleeHit3',
    'Sound/eMeleeHit4',
  ] as const);
  playSound(key, { at: positionOf(target), rate: 0.95 + Math.random() * 0.1 });
}

const BOWS_GROUP = 4;
// bolts and arrows (ammunition in the other hand)
const AMMUNITION = [7, 15];
// crossbows are numbers 8-14 and 16 of the bows group, the rest are bows
const isCrossbow = (num: number) => (num >= 8 && num <= 14) || num === 16;

// the bow or crossbow of the local player, if any
export function rangedWeapon() {
  const weapons = [Store.playerData.rightHandSlot, Store.playerData.leftHandSlot];
  return weapons.find(w => w?.group === BOWS_GROUP && !AMMUNITION.includes(w.num));
}

// swing of the local player's weapon (or its bow / crossbow)
export function playSwingSound(player: Entity) {
  const ranged = rangedWeapon();
  const key: Sounds = ranged
    ? isCrossbow(ranged.num)
      ? 'Sound/eCrossbow'
      : 'Sound/eBow'
    : random(['Sound/eSwingWeapon1', 'Sound/eSwingWeapon2'] as const);
  playSound(key, { at: positionOf(player) });
}

// ---- volume settings (Options window)

const SETTINGS_KEY = 'audioSettings';

export type AudioSettings = { music: number; effects: number };

const DEFAULT_SETTINGS: AudioSettings = {
  music: SoundsManager.musicVolume,
  effects: SoundsManager.effectsVolume,
};

export function loadAudioSettings(): AudioSettings {
  try {
    const saved = JSON.parse(LocalStorage.load(SETTINGS_KEY) ?? 'null');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function applyAudioSettings(settings: AudioSettings) {
  SoundsManager.musicTrack?.setVolume(settings.music);
  SoundsManager.effectsTrack?.setVolume(settings.effects);
}

export function saveAudioSettings(settings: AudioSettings) {
  LocalStorage.save(SETTINGS_KEY, JSON.stringify(settings));
  applyAudioSettings(settings);
}
