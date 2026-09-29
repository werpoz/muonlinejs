import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { itemTooltipProps } from '../../../../components/itemTooltip';
import { MuWindow } from '../../../../components/muWindow';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { Item } from '../../../../../ecs/world';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import { isUsableFromInventory } from '../../../../../common/consumables';
import { ItemStorageKind } from '../../../../../common/itemStorageKind';

const FIRST_INVENTORY_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;
const COLUMNS = InventoryConstants.RowSize;

// positions in the 190x429 window of the original client
const CELL = 20;
const GRID_X = 15;
const GRID_Y = 208;

// equipment slot -> [background image, x, y, width, height]
const EQUIPMENT: [number, string, number, number, number, number][] = [
  [InventoryConstants.PetSlot, 'pet', 15, 44, 46, 46],
  [InventoryConstants.HelmSlot, 'helm', 75, 44, 46, 46],
  [InventoryConstants.WingsSlot, 'wings', 120, 44, 61, 46],
  [InventoryConstants.LeftHandSlot, 'weapon_left', 15, 87, 46, 66],
  [InventoryConstants.PendantSlot, 'pendant', 54, 87, 28, 28],
  [InventoryConstants.ArmorSlot, 'armor', 75, 87, 46, 66],
  [InventoryConstants.RightHandSlot, 'weapon_right', 134, 87, 46, 66],
  [InventoryConstants.GlovesSlot, 'gloves', 15, 150, 46, 46],
  [InventoryConstants.Ring1Slot, 'ring', 54, 150, 28, 28],
  [InventoryConstants.PantsSlot, 'pants', 75, 150, 46, 46],
  [InventoryConstants.Ring2Slot, 'ring', 114, 150, 28, 28],
  [InventoryConstants.BootsSlot, 'boots', 134, 150, 46, 46],
];

const heldClass = (slot: number) =>
  Store.heldItemSlot === slot &&
  Store.heldItemStorage === ItemStorageKind.Inventory
    ? ' held'
    : '';

const itemName = (item: Item) => {
  const config = ItemsDatabase.getItem(item.group, item.num);
  return (config?.ItemName ?? 'Item') + (item.lvl ? ` +${item.lvl}` : '');
};

const onUse = (e: React.MouseEvent, item: Item | null, slot: number) => {
  // right click uses potions / learns skills, like in the original client
  e.preventDefault();
  if (isUsableFromInventory(item)) Store.consumeItem(slot);
};

const EquipmentSlot = observer(
  ({
    slot,
    image,
    x,
    y,
    w,
    h,
  }: {
    slot: number;
    image: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }) => {
    const item = Store.playerData.items[slot];
    return (
      <div
        className={`equipment-slot${heldClass(slot)}`}
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          backgroundImage: `url('/interface/equip_${image}.png')`,
        }}
        aria-label={item ? itemName(item) : undefined}
        {...(item ? itemTooltipProps(item) : {})}
        onClick={() => Store.onItemSlotClick(slot)}
      >
        {!!item && <ItemIcon {...item} />}
      </div>
    );
  }
);

// items of the 8x8 grid, drawn over the cells with their size
const GridItem = observer(({ item, slot }: { item: Item; slot: number }) => {
  const config = ItemsDatabase.getItem(item.group, item.num);
  const index = slot - FIRST_INVENTORY_SLOT;

  return (
    <div
      className={`grid-item${heldClass(slot)}`}
      style={{
        left: GRID_X + (index % COLUMNS) * CELL,
        top: GRID_Y + Math.floor(index / COLUMNS) * CELL,
        width: (config?.X ?? 1) * CELL,
        height: (config?.Y ?? 1) * CELL,
      }}
      aria-label={itemName(item)}
      {...itemTooltipProps(item)}
      onClick={() => Store.onItemSlotClick(slot)}
      onContextMenu={e => onUse(e, item, slot)}
    >
      <ItemIcon {...item} />
      {(item.durability ?? 0) > 1 && item.group === 14 && (
        <span className="stack">{item.durability}</span>
      )}
    </div>
  );
});

const HOT_KEYS = ['KeyI', 'KeyV'];

const closeInventory = () => {
  Store.inventoryEnabled = false;
  Store.cancelHeldItem();
  Store.closeNpc();
  Store.cancelTrade();
};

export const Inventory = observer(() => {
  const playerData = Store.playerData;

  useEventBus('keyPressed', key => {
    if (!HOT_KEYS.includes(key)) return;
    if (Store.inventoryEnabled) closeInventory();
    else Store.inventoryEnabled = true;
  });

  if (!Store.inventoryEnabled) return null;

  const gridItems = playerData.inventoryItems
    .map((item, i) => ({ item, slot: FIRST_INVENTORY_SLOT + i }))
    .filter(({ item }) => !!item);

  return (
    <MuWindow title="Inventory" className="inventory" onClose={closeInventory}>
      {EQUIPMENT.map(([slot, image, x, y, w, h]) => (
        <EquipmentSlot
          key={slot}
          slot={slot}
          image={image}
          x={x}
          y={y}
          w={w}
          h={h}
        />
      ))}

      {/* empty cells: targets to put the held item */}
      <div
        className="grid"
        style={{
          left: GRID_X,
          top: GRID_Y,
          width: COLUMNS * CELL,
          height: 8 * CELL,
        }}
      >
        {playerData.inventoryItems.map((_, i) => (
          <div
            key={i}
            className="grid-cell"
            onClick={() => Store.onItemSlotClick(FIRST_INVENTORY_SLOT + i)}
          />
        ))}
      </div>

      {gridItems.map(({ item, slot }) => (
        <GridItem key={slot} item={item!} slot={slot} />
      ))}

      <div className="money">{playerData.money.toLocaleString('en-US')}</div>
    </MuWindow>
  );
});
