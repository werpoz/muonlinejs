import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import {
  JEWEL_MIXES,
  PACK_FEE_PER_TEN,
  UNPACK_FEE,
  isSingleJewel,
  packedJewelCount,
  packedJewelType,
} from '../../../../../common/jewelMix';
import type { Item } from '../../../../../ecs/world';

const STACKS = [10, 20, 30];
const FIRST_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;
const ROW_SIZE = InventoryConstants.RowSize;
const ROWS = InventoryConstants.InventoryRows;

const zen = (money: number) => money.toLocaleString('en-US');

// free cells of the inventory grid (8x8), for the unpacked jewels
function freeCells(items: (Item | null)[]): number {
  const used = new Array(ROW_SIZE * ROWS).fill(false);
  for (let i = 0; i < ROW_SIZE * ROWS; i++) {
    const item = items[FIRST_SLOT + i];
    if (!item) continue;
    const config = ItemsDatabase.getItem(item.group, item.num);
    const w = config?.X ?? 1;
    const h = config?.Y ?? 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = i + y * ROW_SIZE + x;
        if (cell < used.length) used[cell] = true;
      }
    }
  }
  return used.filter(u => !u).length;
}

// Lahap: packs 10, 20 or 30 jewels of a kind in a bundle (easier to trade
// and store) and unpacks bundles again
export const Lahap = observer(() => {
  if (!Store.lahapOpen) return null;

  const d = Store.playerData;
  const inventory = d.items.slice(FIRST_SLOT, FIRST_SLOT + ROW_SIZE * ROWS);
  const counts = JEWEL_MIXES.map(mix => inventory.filter(i => isSingleJewel(i, mix)).length);
  const bundles = inventory
    .map((item, i) => ({ item, slot: FIRST_SLOT + i, type: packedJewelType(item) }))
    .filter((b): b is { item: Item; slot: number; type: number } => b.type >= 0);
  const free = freeCells(d.items);

  const jewels = JEWEL_MIXES.map((mix, type) => ({ mix, type, count: counts[type] })).filter(
    j => j.count > 0
  );

  return (
    <MuWindow title="Lahap" subtitle="Jewel packing" className="lahap" onClose={() => Store.closeNpc()}>
      <div className="lahap-content">
        <div className="section-title">Pack jewels</div>
        <div className="note">
          {zen(PACK_FEE_PER_TEN)} Zen for every 10 jewels
        </div>
        {!jewels.length && <div className="empty">You have no jewels to pack</div>}
        {jewels.map(({ mix, type, count }) => (
          <div key={type} className="jewel-row">
            <span className="jewel-name" title={mix.name}>
              {mix.name}
            </span>
            <span className="jewel-count">{count}</span>
            {STACKS.map((stack, i) => {
              const fee = (stack / 10) * PACK_FEE_PER_TEN;
              const enough = count >= stack;
              const money = d.money >= fee;
              return (
                <button
                  key={stack}
                  className="small-button"
                  disabled={!enough || !money}
                  title={
                    !enough
                      ? `You need ${stack} jewels`
                      : !money
                        ? 'Not enough zen'
                        : `Pack ${stack} for ${zen(fee)} Zen`
                  }
                  onClick={() => Store.packJewels(type, i)}
                >
                  x{stack}
                </button>
              );
            })}
          </div>
        ))}

        <div className="section-title">Unpack</div>
        <div className="note">{zen(UNPACK_FEE)} Zen for a bundle</div>
        {!bundles.length && <div className="empty">You have no bundles</div>}
        {bundles.map(({ item, slot, type }) => {
          const pieces = packedJewelCount(item);
          const space = free >= pieces;
          const money = d.money >= UNPACK_FEE;
          return (
            <div key={slot} className="jewel-row">
              <span className="jewel-name" title={JEWEL_MIXES[type].name}>
                {JEWEL_MIXES[type].name}
              </span>
              <span className="jewel-count">x{pieces}</span>
              <button
                className="small-button wide"
                disabled={!space || !money}
                title={
                  !space
                    ? `You need ${pieces} free slots`
                    : !money
                      ? 'Not enough zen'
                      : undefined
                }
                onClick={() => Store.unpackJewels(type, slot)}
              >
                Unpack
              </button>
            </div>
          );
        })}
      </div>
    </MuWindow>
  );
});
