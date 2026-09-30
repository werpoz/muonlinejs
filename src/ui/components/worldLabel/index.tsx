import { With } from 'miniplex';
import './style.less';
import { useRef } from 'react';
import { Entity } from '../../../ecs/world';
import { usePositionOnScreen } from '../../../hooks';

type Props = {
  entity: With<Entity, 'transform' | 'screenPosition'>;
  text: string;
  // second line (guild of a player)
  subText?: string;
  // color of the name (PK state)
  className?: string;
  // name of the personal store of a player, clickable
  sign?: string;
  onSignClick?: () => void;
};

export const WorldLabel = ({
  entity,
  text,
  subText,
  className,
  sign,
  onSignClick,
}: Props) => {
  const elementRef = useRef<HTMLDivElement>(null);

  usePositionOnScreen(entity, elementRef, 0, 0);

  return (
    <div ref={elementRef} className={`world-label ${className ?? ''}`}>
      {!!sign && (
        <div className="shop-sign" title="Open the store" onClick={onSignClick}>
          {sign}
        </div>
      )}
      {!!subText && <div className="sub-text">[{subText}]</div>}
      <div className="text">{text}</div>
    </div>
  );
};
