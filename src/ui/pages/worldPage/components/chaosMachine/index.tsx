import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { MuWindow } from '../../../../components/muWindow';
import { itemTooltipProps } from '../../../../components/itemTooltip';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { ItemStorageKind } from '../../../../../common/itemStorageKind';
import { getItemName } from '../../../../../common/itemInfo';
import { useEventBus } from '../../../../../hooks/useEventBus';

// grid of the chaos machine: 8x4 cells of 20px
const COLUMNS = 8;
const ROWS = 4;
const CELL = 20;
const GRID_X = 15;
const GRID_Y = 50;

const CHAOS = ItemStorageKind.ChaosMachine;

// the server finds the combination from the items
const RECIPES = [
  'Chaos weapon: item +4 with option + Jewel of Chaos',
  'Item +10 ~ +15: item +9 ~ +14 + Jewel of Chaos + Jewels of Bless and Soul',
  'Wings: Chaos weapon + item +4 with option + Jewel of Chaos',
  'Fruit: Jewel of Creation + Jewel of Chaos',
];

// Chaos Goblin's machine: put the items like in the vault and press the
// combine button. Items are lost when a combination fails.
export const ChaosMachine = observer(() => {
  useEventBus('keyPressed', key => {
    if (key === 'Escape' && Store.chaosMachine) Store.closeNpc();
  });

  const machine = Store.chaosMachine;
  if (!machine) return null;

  return (
    <MuWindow
      title="Chaos Machine"
      className="chaos-machine"
      onClose={() => Store.closeNpc()}
    >
      <div
        className="chaos-grid"
        style={{
          left: GRID_X,
          top: GRID_Y,
          width: COLUMNS * CELL,
          height: ROWS * CELL,
        }}
      >
        {machine.items.map((_, slot) => (
          <div
            key={slot}
            className="chaos-cell"
            onClick={() => Store.onItemSlotClick(slot, CHAOS)}
          />
        ))}
      </div>

      {machine.items.map((item, slot) => {
        if (!item) return null;
        const config = ItemsDatabase.getItem(item.group, item.num);
        const held =
          Store.heldItemSlot === slot && Store.heldItemStorage === CHAOS;

        return (
          <div
            key={slot}
            className={`chaos-item${held ? ' held' : ''}`}
            aria-label={getItemName(item)}
            {...itemTooltipProps(item)}
            style={{
              left: GRID_X + (slot % COLUMNS) * CELL,
              top: GRID_Y + Math.floor(slot / COLUMNS) * CELL,
              width: (config?.X ?? 1) * CELL,
              height: (config?.Y ?? 1) * CELL,
            }}
            onClick={() => Store.onItemSlotClick(slot, CHAOS)}
          >
            <ItemIcon {...item} />
          </div>
        );
      })}

      <div className="chaos-help">
        <div className="caption">Combinations</div>
        {RECIPES.map(recipe => (
          <div key={recipe} className="recipe">
            {recipe}
          </div>
        ))}
        <div className="warning">
          If the combination fails, the items may be lost.
        </div>
      </div>

      <button
        className="chaos-mix"
        title="Combine"
        onClick={() => Store.mixChaosMachine()}
      />
    </MuWindow>
  );
});
