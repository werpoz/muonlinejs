import type { IVector2Like } from '../../libs/babylon/exports';
import { PlayerAction, ServerPlayerActionType } from '../../common/objects/enum';
import { Store } from '../../store';
import type { Entity, ISystemFactory, World } from '../world';
import { getLookingDirection } from './networkSystem';

const MELEE_RANGE = 2; // tiles
const BOW_RANGE = 6;
const ATTACK_INTERVAL = 0.8; // seconds between hits
const ATTACK_ANIMATION_TIME = 0.6;
const REPATH_INTERVAL = 0.3;

const ITEM_GROUP_SPEARS = 3;
const ITEM_GROUP_BOWS = 4;
const FIRST_CROSSBOW_NUM = 8;

export function isAttackable(e: Entity | null | undefined): e is Entity {
  return (
    !!e &&
    !!e.monster &&
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

function getAttackAction(player: Entity): PlayerAction {
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

  const stop = () => {
    world.attackTarget = null;
    goal = null;
  };

  return {
    update: dt => {
      cooldown -= dt;
      repathDelay -= dt;

      const player = world.playerEntity;
      if (!player || player.dead) return;

      const pressed = world.pointerPressed;
      const hovered = world.currentPointerTarget;

      if (pressed && !wasPressed) {
        // a new click selects the monster under the cursor, or cancels
        world.attackTarget = isAttackable(hovered) ? hovered : null;
        goal = null;
        hitsSinceClick = 0;
      } else if (!pressed && wasPressed && hitsSinceClick > 0) {
        // released after hitting: a click is a single hit
        stop();
      } else if (pressed && isAttackable(hovered)) {
        world.attackTarget = hovered;
      }
      wasPressed = pressed;

      const target = world.attackTarget;
      if (!target) return;
      if (!isAttackable(target)) {
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

      if (tileDistance(playerTile, targetTile) > getAttackRange(player)) {
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
      player.playerAnimation.action = getAttackAction(player);
      player.playerAnimation.oneShotTime = ATTACK_ANIMATION_TIME;

      hitsSinceClick++;
      Store.sendHitRequest(
        target.netId!,
        ServerPlayerActionType.Attack1,
        getLookingDirection(playerTile, targetTile)
      );

      // single click = single hit, holding the button keeps attacking
      if (!pressed) stop();
    },
  };
};
