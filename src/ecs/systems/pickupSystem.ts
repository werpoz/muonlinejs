import type { IVector2Like } from '../../libs/babylon/exports';
import { EventBus } from '../../libs/eventBus';
import { Store } from '../../store';
import type { Entity, ISystemFactory } from '../world';

const PICKUP_RANGE = 1; // tiles
const SPACE_PICKUP_RADIUS = 6; // tiles, nearest item picked with Space
const REPATH_INTERVAL = 0.3;

export function isPickable(e: Entity | null | undefined): e is Entity {
  return (
    !!e && !!e.droppedItem && !e.objOutOfScope && e.netId != null && !!e.transform
  );
}

const toTile = (e: Entity): IVector2Like => ({
  x: ~~e.transform!.pos.x,
  y: ~~e.transform!.pos.z,
});

const tileDistance = (a: IVector2Like, b: IVector2Like) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Click an item on the ground (or press Space for the nearest one):
// walk to it and send PickupItemRequest.
export const PickupSystem: ISystemFactory = world => {
  const itemsQuery = world.with('droppedItem', 'transform', 'netId');

  let target: Entity | null = null;
  let wasPressed = false;
  let repathDelay = 0;
  let walking = false;

  EventBus.on('keyPressed', code => {
    if (code !== 'Space') return;

    const player = world.playerEntity;
    if (!player) return;

    const playerTile = toTile(player);
    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    for (const item of itemsQuery) {
      if (!isPickable(item)) continue;
      const d = tileDistance(playerTile, toTile(item));
      if (d <= SPACE_PICKUP_RADIUS && d < nearestDist) {
        nearest = item;
        nearestDist = d;
      }
    }

    target = nearest;
    walking = false;
  });

  return {
    update: dt => {
      repathDelay -= dt;

      const player = world.playerEntity;
      if (!player || player.dead) return;

      const pressed = world.pointerPressed && !world.pointerConsumed;
      if (pressed && !wasPressed) {
        const hovered = world.currentPointerTarget;
        // a click elsewhere cancels a pending pick up
        target = isPickable(hovered) ? hovered : null;
        walking = false;
      }
      wasPressed = pressed;

      if (!target) return;
      if (!isPickable(target)) {
        target = null;
        return;
      }

      const playerTile = toTile(player);
      const itemTile = toTile(target);
      const isMoving = !!player.pathfinding.path?.length;

      if (tileDistance(playerTile, itemTile) > PICKUP_RANGE) {
        const arrived = walking && !isMoving && player.playerMoveTo.handled;
        if ((walking && !arrived) || repathDelay > 0) return;
        if (arrived) {
          // could not get close enough (blocked path)
          target = null;
          return;
        }

        repathDelay = REPATH_INTERVAL;
        walking = true;
        player.playerMoveTo.point.x = itemTile.x;
        player.playerMoveTo.point.y = itemTile.y;
        player.playerMoveTo.handled = false;
        player.playerMoveTo.sendToServer = true;
        return;
      }

      if (isMoving) return;

      Store.sendPickupRequest(target.netId!);
      target = null;
    },
  };
};
