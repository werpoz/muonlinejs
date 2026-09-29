import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type CSSProperties } from 'react';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { SkillBar } from '../skillBar';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import {
  CONSUMABLE_HOT_KEYS,
  type ConsumableHotKey,
  findHotKeyItem,
} from '../../../../../common/consumables';

// The main frame of the original client is 640x51 px; everything inside is
// positioned in those coordinates (see public/interface) and the whole frame
// is scaled to the screen width.
export const FRAME_WIDTH = 640;
export const FRAME_HEIGHT = 51;
const MAX_SCALE = 2;

const FIRST_INVENTORY_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;

const getHotKeyItem = (hotKey: ConsumableHotKey) =>
  findHotKeyItem(Store.playerData.items, hotKey, FIRST_INVENTORY_SLOT);

// x of the Q, W, E, R slots
const POTION_SLOTS_X = [2, 40, 78, 116];

export const box = (
  x: number,
  y: number,
  w: number,
  h: number
): CSSProperties => ({ left: x, top: y, width: w, height: h });

const PotionSlot = observer(
  ({ hotKey, x }: { hotKey: ConsumableHotKey; x: number }) => {
    const { item, count, slot } = getHotKeyItem(hotKey);

    return (
      <div
        className="potion-slot"
        style={box(x, 3, 35, 37)}
        title={hotKey}
        onClick={() => slot >= 0 && Store.consumeItem(slot)}
      >
        {!!item && <ItemIcon {...item} />}
        {count > 0 && <span className="count">{count}</span>}
      </div>
    );
  }
);

// HP / mana orb: the colored image, visible from the bottom up to the value
const Orb = ({
  className,
  x,
  percent,
  value,
  max,
}: {
  className: string;
  x: number;
  percent: number;
  value: number;
  max: number;
}) => (
  <div
    className={`orb ${className}`}
    style={box(x, 2, 45, 39)}
    title={`${value} / ${max}`}
  >
    <div className="fill" style={{ height: Math.round(39 * percent) }} />
    <span className="value">{value}</span>
  </div>
);

const VerticalBar = ({
  className,
  x,
  percent,
  title,
}: {
  className: string;
  x: number;
  percent: number;
  title: string;
}) => (
  <div
    className={`vertical-bar ${className}`}
    style={box(x, 2, 16, 39)}
    title={title}
  >
    <div className="fill" style={{ height: Math.round(39 * percent) }} />
  </div>
);

const toggleInventory = () => {
  Store.inventoryEnabled = !Store.inventoryEnabled;
  if (!Store.inventoryEnabled) {
    Store.cancelHeldItem();
    Store.closeNpc();
  }
};

// buttons at the right: character, inventory, friends, menu
const BUTTONS: { className: string; title: string; onClick?: () => void }[] = [
  {
    className: 'bt01',
    title: 'Character (C)',
    onClick: () => {
      Store.characterInfoEnabled = !Store.characterInfoEnabled;
    },
  },
  { className: 'bt02', title: 'Inventory (I)', onClick: toggleInventory },
  { className: 'bt03', title: 'Friends' },
  { className: 'bt04', title: 'Menu' },
];

function useFrameScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / FRAME_WIDTH, MAX_SCALE);
      setScale(s);
      // other HUD parts (panels, chat) stay above the frame
      document.documentElement.style.setProperty(
        '--main-frame-height',
        `${FRAME_HEIGHT * s}px`
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

export const BottomBar = observer(() => {
  const playerData = Store.playerData;
  const scale = useFrameScale();

  useEventBus('keyPressed', code => {
    const hotKey = CONSUMABLE_HOT_KEYS.find(k => code === `Key${k}`);
    if (!hotKey) return;

    const { slot } = getHotKeyItem(hotKey);
    if (slot >= 0) Store.consumeItem(slot);
  });

  return (
    <div className="bottom-bar" style={{ height: FRAME_HEIGHT * scale }}>
      <div
        className="main-frame"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {CONSUMABLE_HOT_KEYS.map((hotKey, i) => (
          <PotionSlot key={hotKey} hotKey={hotKey} x={POTION_SLOTS_X[i]} />
        ))}

        <Orb
          className="hp"
          x={158}
          percent={playerData.hpPercent}
          value={playerData.currentHP}
          max={playerData.maxHP}
        />
        <VerticalBar
          className="sd"
          x={203}
          percent={playerData.sdPercent}
          title={`SD ${playerData.currentSD} / ${playerData.maxSD}`}
        />

        <SkillBar />

        <VerticalBar
          className="ag"
          x={421}
          percent={playerData.agPercent}
          title={`AG ${playerData.currentAG} / ${playerData.maxAG}`}
        />
        <Orb
          className="mp"
          x={437}
          percent={playerData.mpPercent}
          value={playerData.currentMP}
          max={playerData.maxMP}
        />

        {BUTTONS.map((b, i) => (
          <button
            key={b.className}
            className={`menu-button ${b.className}`}
            style={box(489 + i * 38, 0, 38, 42)}
            title={b.title}
            onClick={b.onClick}
          />
        ))}

        <div
          className="exp-bar"
          style={box(2, 43, 626, 5)}
          title={`Exp ${playerData.exp} / ${playerData.expToNextLvl}`}
        >
          <div
            className="fill"
            style={{ width: `${(playerData.expPercent * 100).toFixed(1)}%` }}
          />
        </div>
      </div>
    </div>
  );
});
