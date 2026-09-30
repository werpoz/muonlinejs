import type { IVector2Like } from '../../libs/babylon/exports';
import { Store } from '../../store';
import type { Entity, ISystemFactory } from '../world';

const TALK_RANGE = 3; // tiles

export function isTalkable(e: Entity | null | undefined): e is Entity {
  return (
    !!e &&
    e.npcType != null &&
    !e.monster &&
    e.netId != null &&
    !e.objOutOfScope &&
    !!e.transform
  );
}

const toTile = (e: Entity): IVector2Like => ({
  x: ~~e.transform!.pos.x,
  y: ~~e.transform!.pos.z,
});

const tileDistance = (a: IVector2Like, b: IVector2Like) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Left click on an NPC: walk close to it and send TalkToNpcRequest.
export const NpcTalkSystem: ISystemFactory = world => {
  let target: Entity | null = null;
  let wasPressed = false;
  let walking = false;

  return {
    update: () => {
      const player = world.playerEntity;
      if (!player || player.dead) return;

      const pressed =
        world.pointerPressed &&
        world.pointerButton === 0 &&
        !world.pointerConsumed;
      if (pressed && !wasPressed) {
        const hovered = world.currentPointerTarget;
        target = isTalkable(hovered) ? hovered : null;
        walking = false;
        // walking away closes an open shop, like in the original client
        if (!target) Store.closeNpc(true);
      }
      wasPressed = pressed;

      if (!target) return;
      if (!isTalkable(target)) {
        target = null;
        return;
      }

      const playerTile = toTile(player);
      const npcTile = toTile(target);
      const isMoving = !!player.pathfinding.path?.length;

      if (tileDistance(playerTile, npcTile) > TALK_RANGE) {
        if (walking) {
          // arrived but still too far (blocked): give up
          if (!isMoving && player.playerMoveTo.handled) target = null;
          return;
        }
        walking = true;
        player.playerMoveTo.point.x = npcTile.x;
        player.playerMoveTo.point.y = npcTile.y + 1;
        player.playerMoveTo.handled = false;
        player.playerMoveTo.sendToServer = true;
        return;
      }

      if (isMoving) return;

      // the chaos machine may refuse to close (items inside)
      if (Store.closeNpc()) Store.talkToNpc(target.netId!);
      target = null;
    },
  };
};
