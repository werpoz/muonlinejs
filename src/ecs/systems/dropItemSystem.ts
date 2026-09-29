import { EventBus } from '../../libs/eventBus';
import { Store } from '../../store';
import type { ISystemFactory } from '../world';

// With an item picked up in the inventory, a click on the world drops it on
// the ground tile under the cursor (DropItemRequest).
export const DropItemSystem: ISystemFactory = world => {
  const scene = world.scene;
  let wasPressed = false;

  EventBus.on('keyPressed', code => {
    if (code === 'Escape') Store.cancelHeldItem();
  });

  return {
    update: () => {
      const pressed = world.pointerPressed;
      const newClick = pressed && !wasPressed;
      wasPressed = pressed;

      if (!pressed) world.pointerConsumed = false;
      if (!newClick) return;

      const slot = Store.heldItemSlot;
      if (slot === null || world.pointerButton !== 0) return;

      // the click belongs to the drop, not to walking/attacking/picking up
      world.pointerConsumed = true;

      const player = world.playerEntity;
      if (!player || player.dead) return;

      const pickInfo = scene.pick(
        scene.pointerX,
        scene.pointerY,
        m => m === world.terrain?.mesh,
        true
      );
      const point = pickInfo?.pickedPoint;
      if (!point) return;

      Store.dropItem(slot, ~~point.x, ~~point.z);
    },
  };
};
