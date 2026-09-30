import type { IVector2Like } from '../../libs/babylon/exports';
import { PlayerAction, ServerPlayerActionType } from '../../common/objects/enum';
import { Store } from '../../store';
import type { Entity, ISystemFactory, World } from '../world';
import { getLookingDirection } from './networkSystem';
import { getSkillInfo } from '../../common/skills';
import { playSwingSound, rangedWeapon } from '../../libs/gameSounds';
import type { PlayerObject } from '../../common/playerObject';
import { ridingAttackAction } from '../../common/mounts';
import { playArrow } from '../../effects/skillEffects';

const MELEE_RANGE = 2; // tiles
const BOW_RANGE = 6;
const ATTACK_INTERVAL = 0.8; // seconds between hits
const ATTACK_ANIMATION_TIME = 0.6;
const REPATH_INTERVAL = 0.3;

const ITEM_GROUP_SPEARS = 3;
const ITEM_GROUP_BOWS = 4;
const FIRST_CROSSBOW_NUM = 8;

// Monsters; other players only with `players` (Ctrl pressed when clicking,
// like the original client: a click on a player must not attack by mistake),
// except the opponent of our duel.
export function isAttackable(
  e: Entity | null | undefined,
  players = false
): e is Entity {
  return (
    !!e &&
    (!!e.monster ||
      ((players || e.netId === Store.duelOpponentId) && !!e.charAppearance && !e.localPlayer)) &&
    !e.dead &&
    !e.objOutOfScope &&
    e.netId != null &&
    !!e.transform
  );
}

function getWeapon(player: Entity) {
  return player.charAppearance?.leftHand ?? player.charAppearance?.rightHand;
}

function getAttackRange(player: Entity) {
  return getWeapon(player)?.group === ITEM_GROUP_BOWS ? BOW_RANGE : MELEE_RANGE;
}

export function getAttackAction(player: Entity): PlayerAction {
  const mount = (player.modelObject as PlayerObject | undefined)?.mountKind;
  if (mount) return ridingAttackAction(mount);
  const weapon = getWeapon(player);
  if (!weapon) return PlayerAction.PLAYER_ATTACK_FIST;

  switch (weapon.group) {
    case ITEM_GROUP_SPEARS:
      return PlayerAction.PLAYER_ATTACK_SPEAR1;
    case ITEM_GROUP_BOWS:
      return weapon.num >= FIRST_CROSSBOW_NUM
        ? PlayerAction.PLAYER_ATTACK_CROSSBOW
        : PlayerAction.PLAYER_ATTACK_BOW;
    default:
      return PlayerAction.PLAYER_ATTACK_SWORD_RIGHT1;
  }
}

const tileDistance = (a: IVector2Like, b: IVector2Like) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Walkable tile next to the target, as close to the player as possible.
function findTileNextTo(world: World, target: IVector2Like, from: IVector2Like) {
  let best: IVector2Like | null = null;
  let bestDist = Infinity;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const tile = { x: target.x + dx, y: target.y + dy };
      if (!world.isWalkable(tile.x, tile.y)) continue;

      const d = Math.hypot(tile.x - from.x, tile.y - from.y);
      if (d < bestDist) {
        bestDist = d;
        best = tile;
      }
    }
  }

  return best;
}

// Click (or hold) on a monster: walk next to it and send HitRequest packets.
export const AttackSystem: ISystemFactory = world => {
  let cooldown = 0;
  let repathDelay = 0;
  let wasPressed = false;
  let hitsSinceClick = 0;
  let goal: IVector2Like | null = null;
  // skill used on the target (right click), null for a normal hit
  let skill: number | null = null;

  const stop = () => {
    world.attackTarget = null;
    goal = null;
  };

  // skill for a right click, or null with a notification why it can't be used
  const skillForRightClick = (): number | null => {
    const current = Store.currentSkill;
    if (current === null) {
      Store.addNotification('Select a skill first', 'error');
      return null;
    }
    return current;
  };

  // Right click on the ground with an area skill: cast it there if in range.
  const castAreaSkillOnGround = (player: Entity, skill: number) => {
    const scene = world.scene;
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      m => m === world.terrain?.mesh,
      true
    );
    const point = pick?.pickedPoint;
    if (!point) return;

    const playerTile = {
      x: ~~player.transform!.pos.x,
      y: ~~player.transform!.pos.z,
    };
    const tile = { x: ~~point.x, y: ~~point.z };
    if (tileDistance(playerTile, tile) > getSkillInfo(skill).range) {
      Store.addNotification('Too far', 'error');
      return;
    }
    if (cooldown > 0) return;
    cooldown = ATTACK_INTERVAL;

    castAreaSkill(player, skill, playerTile, tile);
  };

  const castAreaSkill = (
    player: Entity,
    skill: number,
    from: IVector2Like,
    to: IVector2Like
  ) => {
    player.transform!.rot.y =
      Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
    player.playerAnimation!.action = PlayerAction.PLAYER_SKILL_HAND1;
    player.playerAnimation!.oneShotTime = ATTACK_ANIMATION_TIME;
    Store.sendAreaSkill(skill, to.x, to.y, getLookingDirection(from, to));
  };

  return {
    update: dt => {
      cooldown -= dt;
      repathDelay -= dt;

      const player = world.playerEntity;
      if (!player || player.dead) return;

      const pressed = world.pointerPressed && !world.pointerConsumed;
      const hovered = world.currentPointerTarget;
      const keys = world.keyboardInput.pressedKeys;
      const forceAttack = keys.has('ControlLeft') || keys.has('ControlRight');

      if (pressed && !wasPressed) {
        // a new click selects the monster under the cursor (or a player
        // with Ctrl), or cancels; left button hits, right button uses the
        // selected skill
        world.attackTarget = isAttackable(hovered, forceAttack) ? hovered : null;
        skill = null;
        if (world.pointerButton === 2) {
          const selected = skillForRightClick();
          if (!world.attackTarget) {
            if (selected !== null && !getSkillInfo(selected).targeted) {
              castAreaSkillOnGround(player, selected);
            }
          } else {
            skill = selected;
            if (skill === null) world.attackTarget = null;
          }
        }
        goal = null;
        hitsSinceClick = 0;
      } else if (!pressed && wasPressed && hitsSinceClick > 0) {
        // released after hitting: a click is a single hit
        stop();
      } else if (pressed && isAttackable(hovered, forceAttack)) {
        world.attackTarget = hovered;
      }
      wasPressed = pressed;

      const target = world.attackTarget;
      if (!target) return;
      // a player chosen with Ctrl stays the target
      if (!isAttackable(target, true)) {
        stop();
        return;
      }

      const playerTile = {
        x: ~~player.transform.pos.x,
        y: ~~player.transform.pos.z,
      };
      const targetTile = {
        x: ~~target.transform!.pos.x,
        y: ~~target.transform!.pos.z,
      };
      const isMoving = !!player.pathfinding.path?.length;

      const range =
        skill !== null ? getSkillInfo(skill).range : getAttackRange(player);

      if (tileDistance(playerTile, targetTile) > range) {
        // walk again only when needed, every walk is a packet
        const needsNewGoal =
          !goal || (!isMoving && player.playerMoveTo.handled) ||
          tileDistance(goal, targetTile) > 1;
        if (!needsNewGoal || repathDelay > 0) return;
        repathDelay = REPATH_INTERVAL;

        goal = findTileNextTo(world, targetTile, playerTile);
        if (!goal) {
          stop();
          return;
        }

        player.playerMoveTo.point.x = goal.x;
        player.playerMoveTo.point.y = goal.y;
        player.playerMoveTo.handled = false;
        player.playerMoveTo.sendToServer = true;
        return;
      }

      if (isMoving || cooldown > 0) return;
      cooldown = ATTACK_INTERVAL;

      player.transform.rot.y =
        Math.atan2(targetTile.y - playerTile.y, targetTile.x - playerTile.x) +
        Math.PI / 2;
      player.playerAnimation.action =
        skill !== null && range > MELEE_RANGE
          ? PlayerAction.PLAYER_SKILL_HAND1
          : getAttackAction(player);
      player.playerAnimation.oneShotTime = ATTACK_ANIMATION_TIME;

      hitsSinceClick++;
      if (skill !== null && !getSkillInfo(skill).targeted) {
        Store.sendAreaSkill(
          skill,
          targetTile.x,
          targetTile.y,
          getLookingDirection(playerTile, targetTile)
        );
      } else if (skill !== null) {
        Store.sendTargetedSkill(skill, target.netId!);
      } else {
        Store.sendHitRequest(
          target.netId!,
          ServerPlayerActionType.Attack1,
          getLookingDirection(playerTile, targetTile)
        );
        playSwingSound(player);
        if (rangedWeapon()) playArrow(world, player, target);
      }

      // single click = single hit, holding the button keeps attacking
      if (!pressed) stop();
    },
  };
};
