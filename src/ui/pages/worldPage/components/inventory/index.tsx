import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { Item } from '../../../../../ecs/world';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { useState } from 'react';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import { isUsableFromInventory } from '../../../../../common/consumables';

const FIRST_INVENTORY_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;

const slotClassName = (slot: number) =>
  Store.heldItemSlot === slot ? ' held' : '';

const EquipmentItem = observer(
  ({
    className,
    item,
    slot,
  }: {
    className: string;
    item: Item | null;
    slot: number;
  }) => {
    return (
      <div
        className={`equipment-item ${className}${slotClassName(slot)}`}
        onClick={() => Store.onItemSlotClick(slot)}
      >
        <span className="equipment-item-name">
          {!!item && <ItemIcon {...item} />}
        </span>
      </div>
    );
  }
);

const ItemTooltip = ({
  item,
  children,
}: {
  item: Item | null;
  children: React.ReactNode;
}) => {
  const config = item ? ItemsDatabase.getItem(item.group, item.num) : null;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="tooltip"
      onPointerEnter={() => setIsVisible(true)}
      onPointerLeave={() => setIsVisible(false)}
    >
      {children}
      {!!config && isVisible && (
        <div className="tooltip-content" style={{ left: 0, top: 0 }}>
          <div className="tooltip-content-name">{config.ItemName}</div>
        </div>
      )}
    </div>
  );
};

const InventoryItem = observer(
  ({ item, slot }: { item: Item | null; slot: number }) => {
    const config = item ? ItemsDatabase.getItem(item.group, item.num) : null;
    const w = config?.X ?? 1;
    const h = config?.Y ?? 1;

    return (
      <div
        className={`inventory-item w-${w} h-${h}${!item ? '' : ' used'}${slotClassName(slot)}`}
        onClick={() => Store.onItemSlotClick(slot)}
        onContextMenu={e => {
          // right click uses potions, like in the original client
          e.preventDefault();
          if (isUsableFromInventory(item)) Store.consumeItem(slot);
        }}
      >
        <div className="bg">
          <ItemTooltip item={item}>
            {!!item && <ItemIcon {...item} />}
          </ItemTooltip>
        </div>
      </div>
    );
  }
);

const HOT_KEYS = ['KeyI', 'KeyV'];

export const Inventory = observer(() => {
  const playerData = Store.playerData;

  useEventBus('keyPressed', key => {
    if (HOT_KEYS.includes(key)) {
      Store.inventoryEnabled = !Store.inventoryEnabled;
      if (!Store.inventoryEnabled) Store.cancelHeldItem();
    }
  });

  if (!Store.inventoryEnabled) {
    return null;
  }

  return (
    <div className="inventory">
      <span className="title">Inventory</span>
      <span className="status">[Set options][Socket options]</span>
      <div className="equipment">
        <EquipmentItem
          className="pet"
          slot={InventoryConstants.PetSlot}
          item={playerData.petSlot}
        />
        <EquipmentItem
          className="leftHand"
          slot={InventoryConstants.LeftHandSlot}
          item={playerData.leftHandSlot}
        />
        <EquipmentItem
          className="rightHand"
          slot={InventoryConstants.RightHandSlot}
          item={playerData.rightHandSlot}
        />
        <EquipmentItem
          className="helmet"
          slot={InventoryConstants.HelmSlot}
          item={playerData.helmetSlot}
        />
        <EquipmentItem
          className="armor"
          slot={InventoryConstants.ArmorSlot}
          item={playerData.armorSlot}
        />
        <EquipmentItem
          className="gloves"
          slot={InventoryConstants.GlovesSlot}
          item={playerData.glovesSlot}
        />
        <EquipmentItem
          className="boots"
          slot={InventoryConstants.BootsSlot}
          item={playerData.bootsSlot}
        />
        <EquipmentItem
          className="pants"
          slot={InventoryConstants.PantsSlot}
          item={playerData.pantsSlot}
        />
        <EquipmentItem
          className="leftRing"
          slot={InventoryConstants.Ring1Slot}
          item={playerData.ring1Slot}
        />
        <EquipmentItem
          className="rightRing"
          slot={InventoryConstants.Ring2Slot}
          item={playerData.ring2Slot}
        />
        <EquipmentItem
          className="amulet"
          slot={InventoryConstants.PendantSlot}
          item={playerData.pendantSlot}
        />
        <EquipmentItem
          className="wings"
          slot={InventoryConstants.WingsSlot}
          item={playerData.wingsSlot}
        />
      </div>
      <div className="inventory-items">
        {playerData.inventoryItems.map((item, index) => (
          <InventoryItem
            key={index}
            item={item}
            slot={FIRST_INVENTORY_SLOT + index}
          />
        ))}
      </div>
      <div className="zen">Zen: {playerData.money}</div>
    </div>
  );
});
