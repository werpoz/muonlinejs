import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Item } from '../../../ecs/world';
import { Store } from '../../../store';
import { getItemTooltip } from '../../../common/itemInfo';

// Props for an element that shows the tooltip of an item on hover
// (price: of a personal store)
export const itemTooltipProps = (item: Item, price?: number) => ({
  'data-item': JSON.stringify(item),
  ...(price ? { 'data-price': String(price) } : {}),
});

const OFFSET = 16;

// Tooltip of the item under the mouse: any element with itemTooltipProps.
// A single listener, so it also disappears when the element is removed.
export const ItemTooltip = observer(() => {
  const [hover, setHover] = useState<{
    item: Item;
    price?: number;
    x: number;
    y: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-item]');
      const data = el?.getAttribute('data-item');
      if (!data) {
        setHover(null);
        return;
      }
      setHover(old =>
        old && old.x === e.clientX && old.y === e.clientY
          ? old
          : {
              item: JSON.parse(data),
              price: Number(el!.getAttribute('data-price')) || undefined,
              x: e.clientX,
              y: e.clientY,
            }
      );
    };
    const hide = () => setHover(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', hide);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', hide);
    };
  }, []);

  // keep it inside the screen
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !hover) return;
    const { width, height } = el.getBoundingClientRect();
    let x = hover.x + OFFSET;
    let y = hover.y + OFFSET;
    if (x + width > window.innerWidth) x = hover.x - width - OFFSET;
    if (y + height > window.innerHeight) y = window.innerHeight - height;
    el.style.transform = `translate(${Math.max(0, x)}px, ${Math.max(0, y)}px)`;
  });

  if (!hover) return null;

  const d = Store.playerData;
  const tooltip = getItemTooltip(hover.item, {
    level: d.level,
    str: d.str,
    agi: d.agi,
    vit: d.sta,
    ene: d.eng,
  });

  return (
    <div ref={ref} className="item-tooltip">
      <div className={`name ${tooltip.nameKind}`}>{tooltip.name}</div>
      {tooltip.lines.map((line, i) => (
        <div key={i} className={`line ${line.kind}`}>
          {line.text}
        </div>
      ))}
      {!!hover.price && (
        <div className="line price">
          Price: {hover.price.toLocaleString('en-US')} Zen
        </div>
      )}
    </div>
  );
});
