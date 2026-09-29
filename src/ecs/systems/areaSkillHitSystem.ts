import { EventBus } from '../../libs/eventBus';
import { Store } from '../../store';
import type { ISystemFactory } from '../world';
import { isAttackable } from './attackSystem';

// While the effect of an area skill lasts, the client declares which
// monsters it hits (AreaSkillHit); the server only calculates the damage.
const EFFECT_DURATION = 2.2; // seconds
const HIT_RADIUS = 1.5; // tiles around the target tile
const HIT_INTERVAL = 0.8; // seconds between hits on the same target
const MAX_TARGETS_PER_PACKET = 5;

type Cast = {
  skill: number;
  x: number;
  y: number;
  animationCounter: number;
  timeLeft: number;
  hitCounter: number;
  nextHit: Map<number, number>; // target id -> time left when it can be hit
};

export const AreaSkillHitSystem: ISystemFactory = world => {
  const casts: Cast[] = [];

  EventBus.on('areaSkillCast', ({ skill, x, y, animationCounter }) => {
    casts.push({
      skill,
      x,
      y,
      animationCounter,
      timeLeft: EFFECT_DURATION,
      hitCounter: 0,
      nextHit: new Map(),
    });
  });

  return {
    update: dt => {
      for (let i = casts.length - 1; i >= 0; i--) {
        const cast = casts[i];
        cast.timeLeft -= dt;
        if (cast.timeLeft <= 0) {
          casts.splice(i, 1);
          continue;
        }

        const targets: number[] = [];
        for (const e of world.netObjsQuery) {
          if (targets.length >= MAX_TARGETS_PER_PACKET) break;
          if (!isAttackable(e)) continue;

          const dx = e.transform.pos.x - (cast.x + 0.5);
          const dy = e.transform.pos.z - (cast.y + 0.5);
          if (dx * dx + dy * dy > HIT_RADIUS * HIT_RADIUS) continue;

          // nextHit holds the remaining effect time of the next allowed hit
          const next = cast.nextHit.get(e.netId);
          if (next !== undefined && cast.timeLeft > next) continue;

          cast.nextHit.set(e.netId, cast.timeLeft - HIT_INTERVAL);
          targets.push(e.netId);
        }

        if (targets.length === 0) continue;

        cast.hitCounter++;
        Store.sendAreaSkillHit(
          cast.skill,
          cast.x,
          cast.y,
          cast.hitCounter,
          targets,
          cast.animationCounter
        );
      }
    },
  };
};
