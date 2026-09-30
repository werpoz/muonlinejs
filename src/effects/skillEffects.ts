import { Color3, type Scene, Vector3 } from '../libs/babylon/exports';
import type { Entity, World } from '../ecs/world';
import { spawnEffect, preloadEffects, type EffectOptions } from './effectModels';
import { playEnergyBall } from './energyBall';
import { playFlame } from './flame';

// Visual effect of each skill, made with the original skill models (see
// effectModels.ts). Positions are in the scene: x, height, y of the map.

const CHEST_HEIGHT = 1;

const chest = (e: Entity) =>
  new Vector3(e.transform!.pos.x, e.transform!.pos.y + CHEST_HEIGHT, e.transform!.pos.z);

// a bit over the ground (the model position can be under the terrain)
const GROUND_OFFSET = 0.15;
let currentWorld: World | null = null;

const feet = (e: Entity) => {
  const { x, y, z } = e.transform!.pos;
  const ground = currentWorld?.getTerrainHeight(x, z) ?? y;
  return new Vector3(x, Math.max(y, ground) + GROUND_OFFSET, z);
};

const COLORS = {
  red: new Color3(1, 0.35, 0.25),
  blue: new Color3(0.4, 0.6, 1),
  green: new Color3(0.4, 1, 0.4),
  cyan: new Color3(0.5, 0.95, 1),
};

type SkillContext = {
  world: World;
  scene: Scene;
  caster?: Entity;
  target?: Entity;
  // tile of an area skill
  point?: { x: number; y: number };
};

const fx = (ctx: SkillContext, name: string, options: EffectOptions) =>
  spawnEffect(ctx.scene, name, options);

// moves a model from one position to another at `speed` tiles per second
function projectile(
  ctx: SkillContext,
  name: string,
  from: Vector3,
  to: Vector3,
  options: Partial<EffectOptions> & { speed?: number } = {}
) {
  const { speed = 12, ...rest } = options;
  const duration = Math.max(0.15, Vector3.Distance(from, to) / speed);
  fx(ctx, name, { at: from, to, duration, faceMovement: true, fadeOut: 0.1, ...rest });
  return duration;
}

const later = (seconds: number, fn: () => void) => setTimeout(fn, seconds * 1000);

// position of the area skill (or of its target, or the caster)
function areaPoint(ctx: SkillContext) {
  if (ctx.point) {
    const { x, y } = ctx.point;
    return new Vector3(x + 0.5, ctx.world.getTerrainHeight(x, y) + GROUND_OFFSET, y + 0.5);
  }
  return ctx.target ? feet(ctx.target) : ctx.caster ? feet(ctx.caster) : null;
}

// slashes around the caster (cyclone, twisting slash...)
function slashesAround(ctx: SkillContext, count: number, radius: number) {
  if (!ctx.caster) return;
  const center = chest(ctx.caster);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const to = center.add(new Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius));
    projectile(ctx, 'SwordForce', center, to, { speed: 4, scale: 1.8 });
  }
}

type SkillEffect = (ctx: SkillContext) => void;

const hitAtTarget =
  (name: string, options: Partial<EffectOptions> = {}): SkillEffect =>
  ctx => {
    if (!ctx.target) return;
    fx(ctx, name, { at: chest(ctx.target), duration: 0.6, ...options });
  };

const auraOn =
  (name: string, color?: Color3, options: Partial<EffectOptions> = {}): SkillEffect =>
  ctx => {
    const e = ctx.target ?? ctx.caster;
    if (!e) return;
    fx(ctx, name, { at: feet(e), duration: 1.5, rise: 1.2, color, ...options });
  };

const SKILL_EFFECTS: Record<number, SkillEffect> = {
  // Poison
  1: ctx => ctx.target && fx(ctx, 'Poison01', { at: feet(ctx.target), duration: 1.4, scale: 1.5, rise: 0.6 }),
  // Meteorite: a fire falls from the sky and explodes
  2: ctx => {
    const at = ctx.target ? feet(ctx.target) : areaPoint(ctx);
    if (!at) return;
    const time = projectile(ctx, 'Magic01', at.add(new Vector3(1.5, 8, 1.5)), at, { speed: 14, scale: 2 });
    later(time, () => fx(ctx, 'Circle01', { at, duration: 0.6, scale: 0.08, endScale: 0.2 }));
  },
  // Lightning: a beam from the sky
  3: hitAtTarget('Blast01', { duration: 0.7 }),
  // Fire Ball
  4: ctx => {
    if (!ctx.caster || !ctx.target) return;
    projectile(ctx, 'Magic01', chest(ctx.caster), chest(ctx.target), { scale: 1.3 });
  },
  // Flame
  5: ctx => {
    const at = areaPoint(ctx);
    if (!at) return;
    const flame = playFlame(ctx.scene, at);
    later(1.5, () => flame.stop());
  },
  // Teleport
  6: ctx => ctx.caster && fx(ctx, 'MagicCircle01', { at: feet(ctx.caster), duration: 0.8, scale: 0.8, endScale: 0.2 }),
  // Ice
  7: ctx => ctx.target && fx(ctx, 'Ice01', { at: feet(ctx.target), duration: 1.3, scale: 1, endScale: 1.3 }),
  // Twister: a tornado that goes forward
  8: ctx => {
    if (!ctx.caster) return;
    const from = feet(ctx.caster);
    const goal = areaPoint(ctx) ?? from;
    const direction = goal.subtract(from);
    direction.y = 0;
    if (direction.length() < 0.1) direction.set(0, 0, 1);
    const to = from.add(direction.normalize().scale(5));
    to.y = ctx.world.getTerrainHeight(to.x, to.z);
    projectile(ctx, 'Storm01', from, to, { speed: 3.5, scale: 0.7, spin: 6 });
  },
  // Evil Spirit: spirits fly out of the caster
  9: ctx => {
    if (!ctx.caster) return;
    const center = chest(ctx.caster);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const to = center.add(new Vector3(Math.sin(angle) * 5, 0.5, Math.cos(angle) * 5));
      projectile(ctx, 'darkspirit', center, to, { speed: 5, scale: 1.3 });
    }
  },
  // Hellfire: a ring of fire on the ground
  10: ctx => ctx.caster && fx(ctx, 'Circle01', { at: feet(ctx.caster), duration: 1.4, scale: 0.2, endScale: 0.45, spin: 1 }),
  // Power Wave
  11: ctx => {
    if (!ctx.caster || !ctx.target) return;
    const time = projectile(ctx, 'MagicCircle01', chest(ctx.caster), chest(ctx.target), { scale: 0.3, color: COLORS.blue });
    later(time, () => ctx.target && fx(ctx, 'WaveForce', { at: feet(ctx.target), duration: 0.6, scale: 0.1, endScale: 0.3 }));
  },
  // Aqua Beam
  12: ctx => {
    if (!ctx.caster) return;
    const to = areaPoint(ctx);
    if (!to) return;
    to.y += CHEST_HEIGHT;
    for (let i = 0; i < 4; i++) {
      later(i * 0.08, () => ctx.caster && projectile(ctx, 'MagicCircle01', chest(ctx.caster), to, { speed: 16, scale: 0.35, color: COLORS.cyan }));
    }
  },
  // Cometfall
  13: ctx => {
    const at = areaPoint(ctx);
    if (!at) return;
    fx(ctx, 'Blast01', { at, duration: 0.8, scale: 1.5 });
    later(0.3, () => fx(ctx, 'Circle01', { at, duration: 0.6, scale: 0.1, endScale: 0.25 }));
  },
  // Inferno: explosions around the caster
  14: ctx => ctx.caster && fx(ctx, 'Inferno01', { at: feet(ctx.caster), duration: 1.3, scale: 0.3, endScale: 0.55, spin: 1.5 }),
  // Teleport Ally
  15: ctx => ctx.target && fx(ctx, 'MagicCircle01', { at: feet(ctx.target), duration: 0.8, scale: 0.8, endScale: 0.2 }),
  // Soul Barrier
  16: auraOn('Protect01', COLORS.blue, { duration: 2, rise: 0.3, spin: 3, scale: 1.4 }),
  // Energy Ball
  17: ctx => {
    if (!ctx.caster || !ctx.target) return;
    playEnergyBall(ctx.scene, chest(ctx.caster), chest(ctx.target));
  },
  // Defense
  18: auraOn('Protect01', COLORS.blue, { duration: 1, rise: 0.5, scale: 1.2 }),
  // Falling Slash, Lunge, Uppercut, Slash
  19: hitAtTarget('SwordForce', { scale: 3 }),
  20: hitAtTarget('SwordForce', { scale: 3 }),
  21: hitAtTarget('SwordForce', { scale: 3, rise: 1 }),
  23: hitAtTarget('SwordForce', { scale: 3 }),
  // Cyclone
  22: ctx => slashesAround(ctx, 4, 2),
  // Triple Shot
  24: ctx => {
    if (!ctx.caster || !ctx.target) return;
    const from = chest(ctx.caster);
    const to = chest(ctx.target);
    const side = Vector3.Cross(to.subtract(from), Vector3.Up()).normalize();
    for (const offset of [-0.8, 0, 0.8]) {
      projectile(ctx, 'Arrow01', from, to.add(side.scale(offset)), { speed: 16, scale: 2 });
    }
  },
  // Heal, Greater Defense, Greater Damage
  26: auraOn('MagicCircle01', COLORS.green, { scale: 0.5 }),
  27: auraOn('Protect01', COLORS.blue, { scale: 1.2 }),
  28: auraOn('MagicCircle01', COLORS.red, { scale: 0.5 }),
  // Twisting Slash
  41: ctx => {
    slashesAround(ctx, 6, 3);
    if (ctx.caster) fx(ctx, 'WaveForce', { at: feet(ctx.caster), duration: 0.7, scale: 0.1, endScale: 0.25, spin: 6 });
  },
  // Rageful Blow
  42: ctx => {
    if (!ctx.caster) return;
    fx(ctx, 'Circle01', { at: feet(ctx.caster), duration: 0.7, scale: 0.1, endScale: 0.3 });
    slashesAround(ctx, 4, 2.5);
  },
  // Death Stab, Impale
  43: hitAtTarget('SwordForce', { scale: 4, duration: 0.8 }),
  47: hitAtTarget('SwordForce', { scale: 3 }),
  // Greater Fortitude
  48: auraOn('Protect01', COLORS.red, { scale: 1.3 }),
  // Ice Arrow
  51: ctx => {
    if (!ctx.caster || !ctx.target) return;
    const time = projectile(ctx, 'Arrow01', chest(ctx.caster), chest(ctx.target), { speed: 16, scale: 2, color: COLORS.cyan });
    later(time, () => ctx.target && fx(ctx, 'Ice01', { at: feet(ctx.target), duration: 1, scale: 0.8 }));
  },
  // Penetration
  52: ctx => {
    if (!ctx.caster || !ctx.target) return;
    projectile(ctx, 'Arrow01', chest(ctx.caster), chest(ctx.target), { speed: 20, scale: 2.5 });
  },
};

export function playSkillEffect(
  world: World,
  skill: number,
  caster?: Entity,
  target?: Entity,
  point?: { x: number; y: number }
) {
  currentWorld = world;
  const ctx: SkillContext = { world, scene: world.scene, caster, target, point };
  const effect = SKILL_EFFECTS[skill];
  if (effect) effect(ctx);
  // other skills: a small spark on the target
  else if (target) hitAtTarget('Magic01', { scale: 1 })(ctx);
}

// arrow of a bow attack (not a skill)
export function playArrow(world: World, from: Entity, to: Entity) {
  projectile(
    { world, scene: world.scene },
    'Arrow01',
    chest(from),
    chest(to),
    { speed: 18, scale: 2 }
  );
}

export function preloadSkillEffects() {
  preloadEffects([
    'Magic01',
    'Blast01',
    'Ice01',
    'Poison01',
    'SwordForce',
    'Arrow01',
    'MagicCircle01',
    'Protect01',
    'Circle01',
    'Storm01',
    'darkspirit',
    'WaveForce',
    'Inferno01',
  ]);
}
