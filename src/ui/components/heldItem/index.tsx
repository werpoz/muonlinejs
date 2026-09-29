import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { Store } from '../../../store';
import { ItemIcon } from '../itemIcon';

// Icon of the item picked up in the inventory, following the mouse cursor.
export const HeldItem = observer(() => {
  const ref = useRef<HTMLDivElement>(null);
  const slot = Store.heldItemSlot;
  const item =
    slot === null ? null : Store.itemsOf(Store.heldItemStorage)[slot];

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (el) el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div ref={ref} className="held-item">
      {!!item && <ItemIcon {...item} />}
    </div>
  );
});
