import { ItemsDatabase } from '../../common/itemsDatabase';
import type { ModelObject } from '../../common/modelObject';
import type { PlayerObject } from '../../common/playerObject';
import type { ISystemFactory, Item } from '../world';
import { flyingPetOf, isWings, mountModel, mountOf, wingsModel } from '../../common/mounts';

function loadPart(
  part: Item | null,
  playerObject: PlayerObject,
  socket: ModelObject
) {
  if (!part) return;
  const item = ItemsDatabase.getItem(part.group, part.num);

  if (!item) return;

  playerObject.loadPartAsync(
    item.szModelFolder,
    socket,
    item.szModelName,
    part.lvl,
    part.isExcellent
  );

  return true;
}

export const AppearanceSystem: ISystemFactory = world => {
  const query = world.with('charAppearance', 'modelObject', 'visibility');

  return {
    update: () => {
      for (const {
        charAppearance,
        modelObject,
        visibility,
        attributeSystem,
      } of query) {
        if (visibility.state === 'hidden') continue;
        if (!charAppearance.changed) continue;
        if (!modelObject.Ready) continue;

        const playerObject = modelObject as PlayerObject;

        loadPart(charAppearance.helm, playerObject, playerObject.HelmMask) ||
          playerObject.setDefaultMask();
        loadPart(charAppearance.armor, playerObject, playerObject.Armor) ||
          playerObject.setDefaultArmor();
        loadPart(charAppearance.pants, playerObject, playerObject.Pants) ||
          playerObject.setDefaultPants();
        loadPart(charAppearance.gloves, playerObject, playerObject.Gloves) ||
          playerObject.setDefaultGloves();
        loadPart(charAppearance.boots, playerObject, playerObject.Boots) ||
          playerObject.setDefaultBoots();

        loadPart(charAppearance.leftHand, playerObject, playerObject.Weapon1) ||
          playerObject.Weapon1.Unload();
        loadPart(
          charAppearance.rightHand,
          playerObject,
          playerObject.Weapon2
        ) || playerObject.Weapon2.Unload();

        // wings, and a mount or a pet in the helper slot
        const wings = isWings(charAppearance.wings) ? charAppearance.wings : null;
        playerObject.setWingsModel(wings ? wingsModel(wings) : null);
        const mount = mountOf(charAppearance.pet);
        playerObject.setMountModel(mount, mount ? mountModel(mount, charAppearance.pet!) : null);
        const pet = flyingPetOf(charAppearance.pet);
        playerObject.setFlyingPetModel(pet?.model ?? null, pet?.scale);

        if (attributeSystem) {
          // flying (the fly actions) with wings, but not on a mount
          attributeSystem.setValue('isFlying', wings && !mount ? 1 : 0);
          if (charAppearance.leftHand) {
            const group = charAppearance.leftHand.group;
            const isSpear = group === 3;
            attributeSystem.setValue('isSpearEquipped', isSpear ? 1 : 0);
          }

          if (charAppearance.rightHand) {
            const group = charAppearance.rightHand.group;
            const isSpear = group === 3;
            attributeSystem.setValue('isSpearEquipped', isSpear ? 1 : 0);
          }
        }

        charAppearance.changed = false;
      }
    },
  };
};
