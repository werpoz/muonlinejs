import {
  Color4,
  ParticleSystem,
  Texture,
  Vector3,
  type Scene,
} from '../../libs/babylon/exports';
import { Store } from '../../store';
import type { Entity, ISystemFactory } from '../world';

// Aura of the players with a buff: sparkles (Shiny02 of the original
// client) that rise around the body, colored by the effect, like the
// blessing of the Elf Soldier in the original client.

type Aura = { color1: Color4; color2: Color4 };

const rgb = (r: number, g: number, b: number, a = 1) => new Color4(r, g, b, a);

// by priority: the first active effect gives the aura
const AURAS: [effect: number, aura: Aura][] = [
  // Elf Soldier's blessing: white and golden sparkles
  [3, { color1: rgb(1, 1, 1), color2: rgb(1, 0.85, 0.4) }],
  // Soul Barrier
  [4, { color1: rgb(0.4, 0.6, 1), color2: rgb(0.7, 0.8, 1) }],
  // Greater Damage
  [1, { color1: rgb(1, 0.35, 0.25), color2: rgb(1, 0.6, 0.3) }],
  // Greater Defense
  [2, { color1: rgb(0.3, 0.5, 1), color2: rgb(0.6, 0.8, 1) }],
  // Infinity Arrow
  [6, { color1: rgb(0.7, 0.4, 1), color2: rgb(0.9, 0.7, 1) }],
  // Life Swell / Increase Health
  [8, { color1: rgb(0.4, 1, 0.4), color2: rgb(0.8, 1, 0.6) }],
  [130, { color1: rgb(0.4, 1, 0.4), color2: rgb(0.8, 1, 0.6) }],
  // Berserker
  [81, { color1: rgb(1, 0.2, 0.2), color2: rgb(0.8, 0.1, 0.4) }],
  // Wizardry Enhance
  [82, { color1: rgb(0.5, 0.5, 1), color2: rgb(1, 0.5, 1) }],
];

const BODY_RADIUS = 0.45;
const BODY_HEIGHT = 1.9;

let texture: Texture | null = null;

function createAura(scene: Scene, aura: Aura) {
  texture ??= new Texture('/effects/shiny02.jpg', scene);

  const ps = new ParticleSystem('buffAura', 60, scene);
  ps.particleTexture = texture;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.emitter = Vector3.Zero();
  ps.minEmitBox = new Vector3(-BODY_RADIUS, 0.1, -BODY_RADIUS);
  ps.maxEmitBox = new Vector3(BODY_RADIUS, BODY_HEIGHT, BODY_RADIUS);
  ps.direction1 = new Vector3(-0.1, 0.6, -0.1);
  ps.direction2 = new Vector3(0.1, 1, 0.1);
  ps.minEmitPower = 0.3;
  ps.maxEmitPower = 0.7;
  ps.gravity = Vector3.Zero();
  ps.minSize = 0.15;
  ps.maxSize = 0.36;
  ps.minLifeTime = 0.5;
  ps.maxLifeTime = 1.1;
  ps.minAngularSpeed = -2;
  ps.maxAngularSpeed = 2;
  ps.emitRate = 36;
  ps.color1 = aura.color1;
  ps.color2 = aura.color2;
  ps.colorDead = new Color4(0, 0, 0, 0);
  ps.start();
  return ps;
}

function auraOf(entity: Entity): Aura | null {
  if (entity.netId == null) return null;
  const effects = Store.playerEffects.get(entity.netId);
  if (!effects?.size) return null;
  return AURAS.find(([effect]) => effects.has(effect))?.[1] ?? null;
}

// the mesh isn't centered on the position of the entity: the aura follows
// the center of its bounding box, measured every CENTER_INTERVAL seconds
const CENTER_INTERVAL = 0.5;

type AuraEntry = { ps: ParticleSystem; aura: Aura; offset: { x: number; z: number }; time: number };

export const BuffAuraSystem: ISystemFactory = world => {
  const auras = new Map<Entity, AuraEntry>();

  const remove = (entity: Entity) => {
    const current = auras.get(entity);
    if (!current) return;
    current.ps.stop();
    // the living particles fade out
    setTimeout(() => current.ps.dispose(), 1500);
    auras.delete(entity);
  };

  return {
    update: dt => {
      const players = world.netObjsQuery.entities.filter(e => e.charAppearance);

      for (const entity of players) {
        const aura = entity.objOutOfScope || entity.dead ? null : auraOf(entity);
        const current = auras.get(entity);
        if (current && current.aura !== aura) remove(entity);
        if (!aura) continue;

        let entry = auras.get(entity);
        if (!entry) {
          entry = { ps: createAura(world.scene, aura), aura, offset: { x: 0, z: 0 }, time: 0 };
          auras.set(entity, entry);
        }
        const { x, y, z } = entity.transform.pos;

        entry.time -= dt;
        const model = entity.modelObject;
        if (entry.time <= 0 && model?.gltf) {
          entry.time = CENTER_INTERVAL;
          model.UpdateBoundings();
          const box = model.BoundingBoxLocal;
          entry.offset.x = (box.minimumWorld.x + box.maximumWorld.x) / 2 - x;
          entry.offset.z = (box.minimumWorld.z + box.maximumWorld.z) / 2 - z;
        }
        (entry.ps.emitter as Vector3).set(x + entry.offset.x, y, z + entry.offset.z);
      }

      // players that left
      for (const entity of [...auras.keys()]) {
        if (!players.includes(entity as (typeof players)[number])) remove(entity);
      }
    },
  };
};
