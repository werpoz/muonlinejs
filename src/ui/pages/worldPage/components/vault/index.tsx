import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { MuWindow } from '../../../../components/muWindow';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { ItemStorageKind } from '../../../../../common/itemStorageKind';

// vault grid of the original client: 8x15 cells of 20px
const COLUMNS = 8;
const ROWS = 15;
const CELL = 20;
const GRID_X = 15;
const GRID_Y = 50;

const VAULT = ItemStorageKind.Vault;

// Baz's vault: click an item to pick it up and click a cell of the vault or
// the inventory to put it there.
export const Vault = observer(() => {
  const [amount, setAmount] = useState('');
  const vault = Store.vault;
  if (!vault) return null;

  const moveMoney = (toVault: boolean) => {
    const value = Math.floor(Number(amount));
    if (!(value > 0)) return;
    Store.moveVaultMoney(toVault, value);
    setAmount('');
  };

  return (
    <MuWindow title="Vault" className="vault" onClose={() => Store.closeNpc()}>
      <div
        className="vault-grid"
        style={{
          left: GRID_X,
          top: GRID_Y,
          width: COLUMNS * CELL,
          height: ROWS * CELL,
        }}
      >
        {vault.items.map((_, slot) => (
          <div
            key={slot}
            className="vault-cell"
            onClick={() => Store.onItemSlotClick(slot, VAULT)}
          />
        ))}
      </div>

      {vault.items.map((item, slot) => {
        if (!item) return null;
        const config = ItemsDatabase.getItem(item.group, item.num);
        const held =
          Store.heldItemSlot === slot && Store.heldItemStorage === VAULT;

        return (
          <div
            key={slot}
            className={`vault-item${held ? ' held' : ''}`}
            title={
              (config?.ItemName ?? 'Item') + (item.lvl ? ` +${item.lvl}` : '')
            }
            style={{
              left: GRID_X + (slot % COLUMNS) * CELL,
              top: GRID_Y + Math.floor(slot / COLUMNS) * CELL,
              width: (config?.X ?? 1) * CELL,
              height: (config?.Y ?? 1) * CELL,
            }}
            onClick={() => Store.onItemSlotClick(slot, VAULT)}
          >
            <ItemIcon {...item} />
          </div>
        );
      })}

      <div className="vault-money">
        <span className="zen">{vault.money.toLocaleString('en-US')} Zen</span>
        <input
          value={amount}
          placeholder="Zen"
          inputMode="numeric"
          onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
        />
        <button title="Inventory -> vault" onClick={() => moveMoney(true)}>
          In
        </button>
        <button title="Vault -> inventory" onClick={() => moveMoney(false)}>
          Out
        </button>
      </div>
    </MuWindow>
  );
});
