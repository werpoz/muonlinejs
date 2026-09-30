import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { SHOP_FIRST_SLOT, SHOP_SIZE, Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { itemTooltipProps } from '../../../../components/itemTooltip';
import { MuWindow } from '../../../../components/muWindow';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { ItemStorageKind } from '../../../../../common/itemStorageKind';
import { Item } from '../../../../../ecs/world';
import { useEventBus } from '../../../../../hooks/useEventBus';

// the store: 8x4 cells of 20px
const COLUMNS = 8;
const ROWS = 4;
const CELL = 20;
const GRID_X = 15;
const GRID_Y = 76;
const STORE_NAME_LENGTH = 26;
const MAX_PRICE = 2_000_000_000;

const SHOP = ItemStorageKind.PlayerShop;

const itemName = (item: Item) =>
  (ItemsDatabase.getItem(item.group, item.num)?.ItemName ?? 'Item') +
  (item.lvl ? ` +${item.lvl}` : '');

const formatZen = (money: number) => `${money.toLocaleString('en-US')} Zen`;

type GridItem = { index: number; item: Item; price?: number };

// Cells of a store and its items. `index` is the cell (0-31).
const ShopGrid = observer(
  ({
    items,
    selected,
    onCellClick,
    onItemClick,
    onItemRightClick,
    heldIndex,
  }: {
    items: GridItem[];
    selected: number | null;
    onCellClick?: (index: number) => void;
    onItemClick: (index: number) => void;
    onItemRightClick?: (index: number) => void;
    heldIndex?: number | null;
  }) => (
    <>
      <div
        className="shop-grid"
        style={{
          left: GRID_X,
          top: GRID_Y,
          width: COLUMNS * CELL,
          height: ROWS * CELL,
        }}
      >
        {Array.from({ length: SHOP_SIZE }, (_, index) => (
          <div
            key={index}
            className="shop-cell"
            onClick={() => onCellClick?.(index)}
          />
        ))}
      </div>

      {items.map(({ index, item, price }) => {
        const config = ItemsDatabase.getItem(item.group, item.num);
        const classes = [
          'shop-item',
          selected === index && 'selected',
          heldIndex === index && 'held',
          !price && 'no-price',
        ].filter(Boolean);

        return (
          <div
            key={index}
            className={classes.join(' ')}
            aria-label={itemName(item)}
            {...itemTooltipProps(item, price)}
            style={{
              left: GRID_X + (index % COLUMNS) * CELL,
              top: GRID_Y + Math.floor(index / COLUMNS) * CELL,
              width: (config?.X ?? 1) * CELL,
              height: (config?.Y ?? 1) * CELL,
            }}
            onClick={() => onItemClick(index)}
            onContextMenu={e => {
              e.preventDefault();
              onItemRightClick?.(index);
            }}
          >
            <ItemIcon {...item} />
          </div>
        );
      })}
    </>
  )
);

export const toggleShop = () => {
  if (Store.shopEnabled) {
    Store.shopEnabled = false;
    return;
  }
  Store.shopEnabled = true;
  // the items come from the inventory
  Store.inventoryEnabled = true;
};

// Our personal store (S): items are put in its cells from the inventory, a
// right click on one sets its price. When it is open, the other players see
// its name over us and can buy the items.
export const PersonalShop = observer(() => {
  const [name, setName] = useState(Store.shopName || `${Store.characterName}'s store`);
  const [selected, setSelected] = useState<number | null>(null);
  const [price, setPrice] = useState('');

  useEventBus('keyPressed', key => {
    if (key === 'KeyS') toggleShop();
  });

  if (!Store.shopEnabled) return null;

  const open = Store.shopOpen;
  const items: GridItem[] = [];
  for (let index = 0; index < SHOP_SIZE; index++) {
    const item = Store.playerData.items[SHOP_FIRST_SLOT + index];
    if (item) {
      items.push({ index, item, price: Store.shopPrices.get(SHOP_FIRST_SLOT + index) });
    }
  }
  const selectedItem = items.find(i => i.index === selected);

  const select = (index: number) => {
    setSelected(index);
    const current = Store.shopPrices.get(SHOP_FIRST_SLOT + index);
    setPrice(current ? String(current) : '');
  };


  const savePrice = () => {
    if (!selectedItem) return;
    const value = Math.floor(Number(price || 0));
    if (!(value > 0) || value > MAX_PRICE) {
      Store.addNotification('Invalid price', 'error');
      return;
    }
    Store.setShopPrice(SHOP_FIRST_SLOT + selectedItem.index, value);
  };

  const heldIndex =
    Store.heldItemStorage === SHOP && Store.heldItemSlot !== null
      ? Store.heldItemSlot - SHOP_FIRST_SLOT
      : null;

  return (
    <MuWindow
      title="Personal Store"
      subtitle={open ? 'Open' : 'Closed'}
      className="player-shop"
      onClose={toggleShop}
    >
      <div className="shop-label" style={{ top: 50 }}>
        Store name
      </div>
      <input
        className="shop-input name"
        value={name}
        maxLength={STORE_NAME_LENGTH}
        disabled={open}
        onChange={e => setName(e.target.value)}
      />

      <ShopGrid
        items={items}
        selected={selected}
        heldIndex={heldIndex}
        onCellClick={index => Store.onItemSlotClick(SHOP_FIRST_SLOT + index, SHOP)}
        onItemClick={index => Store.onItemSlotClick(SHOP_FIRST_SLOT + index, SHOP)}
        onItemRightClick={select}
      />

      <div className="shop-label" style={{ top: 162 }}>
        {selectedItem ? itemName(selectedItem.item) : 'Right click an item to set its price'}
      </div>
      {selectedItem && (
        <div className="shop-price-row">
          <input
            className="shop-input"
            value={price}
            placeholder="Price"
            inputMode="numeric"
            disabled={open}
            onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && savePrice()}
          />
          <span className="zen">Zen</span>
          <button className="small-button" disabled={open} onClick={savePrice}>
            Set
          </button>
        </div>
      )}
      {selectedItem && (
        <div className="shop-label current-price" style={{ top: 194 }}>
          {selectedItem.price ? formatZen(selectedItem.price) : 'No price'}
        </div>
      )}

      <div className="shop-help">
        Put items from the inventory in the store and give each one a price.
        Prices can't be changed while the store is open.
      </div>

      <button
        className="small-button shop-toggle"
        onClick={() => (open ? Store.closeShop() : Store.openShop(name.trim() || 'Store'))}
      >
        {open ? 'Close store' : 'Open store'}
      </button>
    </MuWindow>
  );
});

// The store of another player: a click selects an item, Buy buys it.
export const ViewedShop = observer(() => {
  const [selected, setSelected] = useState<number | null>(null);
  const shop = Store.viewedShop;

  useEventBus('keyPressed', key => {
    if (key === 'Escape') Store.closeViewedShop();
  });

  if (!shop) return null;

  const items: GridItem[] = shop.items.map(i => ({
    index: i.slot - SHOP_FIRST_SLOT,
    item: i.item,
    price: i.price,
  }));
  const selectedItem = items.find(i => i.index === selected);
  const canPay = !!selectedItem?.price && selectedItem.price <= Store.playerData.money;

  return (
    <MuWindow
      title={shop.shopName || 'Store'}
      subtitle={shop.playerName}
      className="player-shop viewed"
      onClose={() => Store.closeViewedShop()}
    >
      <div className="shop-label" style={{ top: 50 }}>
        {items.length ? `${items.length} items for sale` : 'Nothing for sale'}
      </div>

      <ShopGrid items={items} selected={selected} onItemClick={setSelected} />

      {selectedItem && (
        <>
          <div className="shop-label" style={{ top: 162 }}>
            {itemName(selectedItem.item)}
          </div>
          <div
            className={`shop-label current-price${canPay ? '' : ' expensive'}`}
            style={{ top: 176 }}
          >
            {formatZen(selectedItem.price ?? 0)}
          </div>
          <button
            className="small-button shop-buy"
            disabled={!canPay}
            title={canPay ? undefined : 'Not enough zen'}
            onClick={() => {
              Store.buyShopItem(SHOP_FIRST_SLOT + selectedItem.index);
              setSelected(null);
            }}
          >
            Buy
          </button>
        </>
      )}

      <div className="shop-label money" style={{ top: 330 }}>
        Your zen: {formatZen(Store.playerData.money)}
      </div>
    </MuWindow>
  );
});
