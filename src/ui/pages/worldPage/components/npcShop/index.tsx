import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { useEventBus } from '../../../../../hooks/useEventBus';

const COLUMNS = 8;
const ROWS = 15;
const CELL = 33; // 32px slot + 1px gap, like the inventory

// Merchant window: click an item to buy it; with an inventory item picked up,
// click the window to sell it.
export const NpcShop = observer(() => {
  useEventBus('keyPressed', key => {
    if (key === 'Escape') Store.closeNpc();
  });

  const shop = Store.npcShop;
  if (!shop) return null;

  const onPanelClick = () => {
    const held = Store.heldItemSlot;
    if (held === null) return;
    Store.cancelHeldItem();
    Store.sellItem(held);
  };

  return (
    <div className="npc-shop" onClick={onPanelClick}>
      <span className="title">Shop</span>
      <div
        className="shop-items"
        style={{ width: COLUMNS * CELL, height: ROWS * CELL }}
      >
        {shop.items.map(({ slot, item }) => {
          const config = ItemsDatabase.getItem(item.group, item.num);
          const w = config?.X ?? 1;
          const h = config?.Y ?? 1;
          const name =
            (config?.ItemName ?? 'Item') + (item.lvl ? ` +${item.lvl}` : '');

          return (
            <div
              key={slot}
              className="shop-item"
              title={name}
              style={{
                left: (slot % COLUMNS) * CELL,
                top: Math.floor(slot / COLUMNS) * CELL,
                width: w * CELL - 1,
                height: h * CELL - 1,
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
      </div>
      <button
        className="close-button"
        onClick={e => {
          e.stopPropagation();
          Store.closeNpc();
        }}
      >
        Close
      </button>
    </div>
  );
});
