import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { itemTooltipProps } from '../../../../components/itemTooltip';
import { MuWindow } from '../../../../components/muWindow';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { useEventBus } from '../../../../../hooks/useEventBus';

// store grid of the original client: 8x15 cells of 20px
const COLUMNS = 8;
const ROWS = 15;
const CELL = 20;
const GRID_X = 15;
const GRID_Y = 50;

// Merchant window: click an item to buy it; with an inventory item picked up,
// click the window to sell it.
export const NpcShop = observer(() => {
  useEventBus('keyPressed', key => {
    if (key === 'Escape') Store.closeNpc();
  });

  const shop = Store.npcShop;
  if (!shop) return null;

  const sellHeldItem = () => {
    const held = Store.heldInventorySlot;
    if (held === null) return;
    Store.cancelHeldItem();
    Store.sellItem(held);
  };

  return (
    <MuWindow
      title="Shop"
      className="npc-shop"
      onClick={sellHeldItem}
      onClose={() => Store.closeNpc()}
    >
      <div
        className="shop-grid"
        style={{
          left: GRID_X,
          top: GRID_Y,
          width: COLUMNS * CELL,
          height: ROWS * CELL,
        }}
      />
      {shop.items.map(({ slot, item }) => {
        const config = ItemsDatabase.getItem(item.group, item.num);
        const name =
          (config?.ItemName ?? 'Item') + (item.lvl ? ` +${item.lvl}` : '');

        return (
          <div
            key={slot}
            className="shop-item"
            aria-label={name}
            {...itemTooltipProps(item)}
            style={{
              left: GRID_X + (slot % COLUMNS) * CELL,
              top: GRID_Y + Math.floor(slot / COLUMNS) * CELL,
              width: (config?.X ?? 1) * CELL,
              height: (config?.Y ?? 1) * CELL,
            }}
            onClick={e => {
              if (Store.heldItemSlot !== null) return; // selling
              e.stopPropagation();
              Store.buyItem(slot);
            }}
          >
            <ItemIcon {...item} />
          </div>
        );
      })}
    </MuWindow>
  );
});
