import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { SkillBar } from '../skillBar';
import { Item } from '../../../../../ecs/world';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import {
  CONSUMABLE_HOT_KEYS,
  type ConsumableHotKey,
  findHotKeyItem,
} from '../../../../../common/consumables';

const FIRST_INVENTORY_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;

const getHotKeyItem = (hotKey: ConsumableHotKey) =>
  findHotKeyItem(Store.playerData.items, hotKey, FIRST_INVENTORY_SLOT);

const ConsumableItem = ({
  hotKey,
  icon,
  count,
}: {
  hotKey: string;
  icon: Item | null;
  count: number;
}) => {
  return (
    <div
      className="consumable-item"
      onClick={() => {
        const { slot } = getHotKeyItem(hotKey as ConsumableHotKey);
        if (slot >= 0) Store.consumeItem(slot);
      }}
    >
      <span className="hot-key">{hotKey}</span>
      {!!icon && <ItemIcon {...icon} />}
      {count > 0 && <span className="count">{count}</span>}
    </div>
  );
};

const VerticalBar = ({
  className,
  value,
  maxValue,
  fillAmount,
}: {
  className: string;
  value: number;
  maxValue: number;
  fillAmount: number;
}) => {
  const filled = (fillAmount * 100).toFixed(0) + '%';

  return (
    <div className={`${className} vertical-bar`}>
      <div className="bg">
        <div className="fill" style={{ height: filled }}></div>
        <span className="current">{value}</span>
      </div>
    </div>
  );
};

export const ExpBar = observer(() => {
  const playerData = Store.playerData;
  const filled = (playerData.expPercent * 100).toFixed(0) + '%';

  return (
    <div className="exp-bar">
      <div className="fill" style={{ width: filled }}></div>
      <span className="value">{playerData.exp}</span>
    </div>
  );
});

export const BottomBar = observer(() => {
  const playerData = Store.playerData;

  useEventBus('keyPressed', code => {
    const hotKey = CONSUMABLE_HOT_KEYS.find(k => code === `Key${k}`);
    if (!hotKey) return;

    const { slot } = getHotKeyItem(hotKey);
    if (slot >= 0) Store.consumeItem(slot);
  });

  return (
    <div className="bottom-bar">
      <div className="panel">
        <div className="consumable-items">
          {CONSUMABLE_HOT_KEYS.map(hotKey => {
            const { item, count } = getHotKeyItem(hotKey);
            return (
              <ConsumableItem
                key={hotKey}
                hotKey={hotKey}
                icon={item}
                count={count}
              />
            );
          })}
        </div>
        <VerticalBar
          className="hp-bar"
          value={playerData.currentHP}
          maxValue={playerData.maxHP}
          fillAmount={playerData.hpPercent}
        />
        <VerticalBar
          className="sd-bar"
          value={playerData.currentSD}
          maxValue={playerData.maxSD}
          fillAmount={playerData.sdPercent}
        />
        <SkillBar />
        <VerticalBar
          className="ag-bar"
          value={playerData.currentAG}
          maxValue={playerData.maxAG}
          fillAmount={playerData.agPercent}
        />
        <VerticalBar
          className="mp-bar"
          value={playerData.currentMP}
          maxValue={playerData.maxMP}
          fillAmount={playerData.mpPercent}
        />
        <div className="buttons">
          <button className="item-shop-btn">Shop</button>
          <button
            className="character-btn"
            onClick={() => {
              Store.characterInfoEnabled = !Store.characterInfoEnabled;
            }}
          >
            Char
          </button>
          <button
            className="inventory-btn"
            onClick={() => {
              Store.inventoryEnabled = !Store.inventoryEnabled;
              if (!Store.inventoryEnabled) {
                Store.cancelHeldItem();
                Store.closeNpc();
              }
            }}
          >
            Inv
          </button>
          <button className="friend-btn">Friend</button>
          <button className="menu-btn">Menu</button>
        </div>
      </div>
      <ExpBar />
    </div>
  );
});
