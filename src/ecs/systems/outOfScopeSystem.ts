import type { ISystemFactory } from '../world';
import { DEATH_FADE_START, DEATH_FADE_TIME } from './animationSystem';

// the server removes a killed monster at once: let its body fade out first
const DEATH_TOTAL_TIME = DEATH_FADE_START + DEATH_FADE_TIME;

export const OutOfScopeSystem: ISystemFactory = world => {
  const query = world.with('objOutOfScope');

  return {
    update: () => {
      for (const e of query) {
        const dying = e.dead && e.monsterAnimation?.deathTime != null;
        if (dying && e.monsterAnimation!.deathTime! < DEATH_TOTAL_TIME) continue;

        world.remove(e);
        e.onDispose?.();

        if (e.modelObject) {
          e.modelObject.dispose();
        }
      }
    },
  };
};
