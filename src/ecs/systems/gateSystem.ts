import gates from '../../common/gates.json';
import { Store } from '../../store';
import type { ISystemFactory } from '../world';

type Gate = (typeof gates)[number];

// Enter gates (areas of a map leading to another map), exported from the
// OpenMU configuration; the client has to detect when the player steps on
// one and send EnterGateRequest.
export const GateSystem: ISystemFactory = world => {
  let currentGate: Gate | null = null;

  const findGate = (map: number, x: number, y: number) =>
    gates.find(
      g => g.map === map && x >= g.x1 && x <= g.x2 && y >= g.y1 && y <= g.y2
    ) ?? null;

  return {
    update: () => {
      const player = world.playerEntity;
      if (!player || player.dead || !world.terrain || Store.isOffline) return;

      const gate = findGate(
        world.mapIndex,
        ~~player.transform.pos.x,
        ~~player.transform.pos.z
      );

      // send once per entering, not every frame while standing on it
      if (gate === currentGate) return;
      currentGate = gate;
      if (!gate) return;

      if (Store.playerData.level < gate.level) {
        Store.addNotification(`Level ${gate.level} required`, 'error');
        return;
      }

      Store.enterGate(gate.number);
    },
  };
};
