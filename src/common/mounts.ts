import type { Item } from '../ecs/world';
import { PlayerAction } from './objects/enum';

// Wings, mounts and the pets that fly next to the player, like the original
// client: the models, and the actions of the player while riding.

const ITEM_GROUP_WINGS = 12;
const ITEM_GROUP_HELPERS = 13;

// wings (group 12, Cape of Lord is 13/30) -> model; the names of
// items.json have another case than the converted files in some of them
const WING_MODELS: Record<string, string> = {
  '12/0': 'Item/Wing01.glb',
  '12/1': 'Item/Wing02.glb',
  '12/2': 'Item/Wing03.glb',
  '12/3': 'Item/Wing04.glb',
  '12/4': 'Item/Wing05.glb',
  '12/5': 'Item/Wing06.glb',
  '12/6': 'Item/Wing07.glb',
  '12/36': 'Item/wing08.glb',
  '12/37': 'Item/wing09.glb',
  '12/38': 'Item/wing10.glb',
  '12/39': 'Item/wing11.glb',
  '12/40': 'Item/DarkLordRobe02.glb',
  '12/41': 'Item/Wing42.glb',
  '12/42': 'Item/Wing43.glb',
  '12/43': 'Item/Wing44.glb',
  '12/49': 'Item/Wing50.glb',
  '12/50': 'Item/Wing51.glb',
  '13/30': 'Item/DarkLordRobe.glb',
  // the small wings of the cash shop: their big version
  '12/130': 'Item/DarkLordRobe.glb',
  '12/131': 'Item/Wing42.glb',
  '12/132': 'Item/Wing01.glb',
  '12/133': 'Item/Wing02.glb',
  '12/134': 'Item/Wing03.glb',
  '12/135': 'Item/Wing50.glb',
};

export const isWings = (item: Item | null | undefined): item is Item =>
  !!item && !!WING_MODELS[`${item.group}/${item.num}`];

export const wingsModel = (item: Item) => WING_MODELS[`${item.group}/${item.num}`];

export type MountKind = 'uniria' | 'dinorant' | 'darkHorse' | 'fenrir';

// Fenrir: the color comes from its option (see FENRIR_*)
export const FENRIR_BLACK = 0x01;
export const FENRIR_BLUE = 0x02;
export const FENRIR_GOLD = 0x04;

export function mountOf(item: Item | null | undefined): MountKind | null {
  if (item?.group !== ITEM_GROUP_HELPERS) return null;
  switch (item.num) {
    case 2:
      return 'uniria';
    case 3:
      return 'dinorant';
    case 4:
      return 'darkHorse';
    case 37:
      return 'fenrir';
  }
  return null;
}

export function mountModel(kind: MountKind, item: Item) {
  switch (kind) {
    case 'uniria':
      return 'Skill/Rider01.glb';
    case 'dinorant':
      return 'Skill/Rider02.glb';
    case 'darkHorse':
      return 'Skill/DarkHorse.glb';
    case 'fenrir': {
      const options = item.excellentOptions ?? 0;
      const color =
        options & FENRIR_GOLD
          ? 'gold'
          : options & FENRIR_BLUE
            ? 'blue'
            : options & FENRIR_BLACK
              ? 'black'
              : 'red';
      return `Skill/fenril_${color}.glb`;
    }
  }
}

// pets flying next to the player: Guardian Angel, Satan, Dark Raven
const FLYING_PETS: Record<number, { model: string; scale: number }> = {
  0: { model: 'Item/helper01.glb', scale: 1 },
  1: { model: 'Item/helper02.glb', scale: 1 },
  5: { model: 'Skill/darkspirit.glb', scale: 0.5 },
};

export const flyingPetOf = (item: Item | null | undefined) =>
  item?.group === ITEM_GROUP_HELPERS ? FLYING_PETS[item.num] : undefined;

// actions of the mount model (Uniria, Dinorant, Dark Horse and Fenrir)
export const MOUNT_ACTION_IDLE = 0;
export const MOUNT_ACTION_RUN = 2;

// the action of the player on a mount
export function ridingAction(kind: MountKind, moving: boolean, armed: boolean): PlayerAction {
  switch (kind) {
    case 'darkHorse':
      return moving ? PlayerAction.PLAYER_RUN_RIDE_HORSE : PlayerAction.PLAYER_STOP_RIDE_HORSE;
    case 'fenrir':
      return moving ? PlayerAction.PLAYER_FENRIR_RUN : PlayerAction.PLAYER_FENRIR_STAND;
    default:
      if (moving) return armed ? PlayerAction.PLAYER_RUN_RIDE_WEAPON : PlayerAction.PLAYER_RUN_RIDE;
      return armed ? PlayerAction.PLAYER_STOP_RIDE_WEAPON : PlayerAction.PLAYER_STOP_RIDE;
  }
}

// the attack of the player on a mount
export function ridingAttackAction(kind: MountKind): PlayerAction {
  switch (kind) {
    case 'darkHorse':
      return PlayerAction.PLAYER_ATTACK_RIDE_HORSE_SWORD;
    case 'fenrir':
      return PlayerAction.PLAYER_FENRIR_ATTACK;
    default:
      return PlayerAction.PLAYER_ATTACK_RIDE_SWORD;
  }
}
