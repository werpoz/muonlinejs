import { hasMonsterSound, playMonsterSound } from '../../libs/gameSounds';
import type { ISystemFactory } from '../world';

// every few seconds one of the monsters near the player may make its idle
// sound (growl, buzz...)
const MIN_DELAY = 3;
const MAX_DELAY = 7;
const NEAR_DISTANCE = 10;

export const MonsterIdleSoundSystem: ISystemFactory = world => {
  let delay = MIN_DELAY;

  return {
    update: dt => {
      delay -= dt;
      if (delay > 0) return;
      delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);

      const me = world.playerEntity;
      if (!me) return;

      const near = world.netObjsQuery.entities.filter(
        e =>
          e.monster &&
          !e.dead &&
          e.worldIndex === world.mapIndex &&
          hasMonsterSound(e, 'idle') &&
          Math.hypot(
            e.transform.pos.x - me.transform.pos.x,
            e.transform.pos.z - me.transform.pos.z
          ) < NEAR_DISTANCE
      );
      if (!near.length) return;

      playMonsterSound(near[Math.floor(Math.random() * near.length)], 'idle');
    },
  };
};
