import './style.less';
import { useRef, useState } from 'react';
import type { Entity } from '../../../ecs/world';
import { useEventBus } from '../../../hooks/useEventBus';
import { usePositionOnScreen } from '../../../hooks';

const LIFETIME_MS = 1000;

type DamageNumber = {
  id: number;
  entity: Entity;
  text: string;
  isLocalPlayer: boolean;
};

let nextId = 0;

const DamageLabel = ({ entity, text, isLocalPlayer }: DamageNumber) => {
  const elementRef = useRef<HTMLDivElement>(null);

  usePositionOnScreen(entity, elementRef, 0, -24);

  return (
    <div ref={elementRef} className="damage-number">
      <div className={isLocalPlayer ? 'text received' : 'text'}>{text}</div>
    </div>
  );
};

// Floating damage over the hit object, from ObjectHit packets.
export const DamageNumbers = () => {
  const [numbers, setNumbers] = useState<DamageNumber[]>([]);

  useEventBus('damageShown', ({ entity, damage, isLocalPlayer }) => {
    const id = nextId++;
    const text = damage > 0 ? `${damage}` : 'Miss';

    setNumbers(list => [...list, { id, entity, text, isLocalPlayer }]);
    setTimeout(() => {
      setNumbers(list => list.filter(n => n.id !== id));
    }, LIFETIME_MS);
  });

  return (
    <div className="damage-numbers">
      {numbers.map(n => (
        <DamageLabel key={n.id} {...n} />
      ))}
    </div>
  );
};
