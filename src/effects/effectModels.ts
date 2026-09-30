import type { AssetContainer } from '@babylonjs/core/assetContainer';
import {
  Color3,
  PBRMaterial,
  Quaternion,
  type Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from '../libs/babylon/exports';
import { resolveUrlToDataFolder } from '../common/resolveUrlToDataFolder';

// Skill effects with the original models of game-assets/Skill (converted
// from the BMD files of the client), drawn glowing like the original client:
// unlit and added to the colors behind them.

const ALPHA_ADD = 1;
const MAX_FRAME_TIME = 0.05;
const PBR_ALPHABLEND = 2;

// Each effect gets its own container, parsed from the cached bytes of the
// model: instances of a shared container became invisible after the first
// one was disposed.
const files = new Map<string, Promise<Uint8Array | null>>();

function loadFile(name: string) {
  let file = files.get(name);
  if (!file) {
    file = fetch(resolveUrlToDataFolder(`Skill/${name}.glb`))
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then(buffer => new Uint8Array(buffer))
      .catch(e => {
        console.error(`effect model ${name}`, e);
        return null;
      });
    files.set(name, file);
  }
  return file;
}

async function loadContainer(scene: Scene, name: string) {
  const bytes = await loadFile(name);
  if (!bytes) return null;
  const container = await SceneLoader.LoadAssetContainerAsync(
    '',
    bytes,
    scene,
    undefined,
    '.glb'
  );
  for (const material of container.materials) {
    if (!(material instanceof PBRMaterial)) continue;
    material.unlit = true;
    material.alphaMode = ALPHA_ADD;
    material.transparencyMode = PBR_ALPHABLEND;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
  }
  return container;
}

export type EffectOptions = {
  // position in the scene (x, height, y of the map)
  at: Vector3;
  // moves from `at` to `to` during the effect (projectiles)
  to?: Vector3;
  // seconds
  duration: number;
  scale?: number;
  // scale at the end (grows or shrinks)
  endScale?: number;
  // turns around the vertical axis, radians per second
  spin?: number;
  // initial direction, radians around the vertical axis
  yaw?: number;
  // faces the movement (projectiles)
  faceMovement?: boolean;
  color?: Color3;
  // brightness fades out during the last part of the effect (0-1)
  fadeOut?: number;
  // height added over the effect (e.g. a rising aura)
  rise?: number;
};

// the glb models are MU models (z up, y mirrored), like ModelObject does
const MODEL_ROTATION = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);

export async function spawnEffect(scene: Scene, name: string, options: EffectOptions) {
  const container = await loadContainer(scene, name);
  if (!container) return;

  container.addAllToScene();
  const node = new TransformNode(`fx_${name}`, scene);
  const model = new TransformNode(`fx_${name}_model`, scene);
  model.parent = node;
  model.scaling.set(1, -1, 1);
  model.rotationQuaternion = MODEL_ROTATION.clone();
  for (const root of [...container.meshes, ...container.transformNodes]) {
    if (!root.parent) root.parent = model;
  }

  const meshes = model.getChildMeshes();
  for (const mesh of meshes) {
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    const material = mesh.material;
    if (options.color && material instanceof PBRMaterial) {
      material.albedoColor = options.color;
    }
  }
  const materials = [...new Set(meshes.map(m => m.material))].filter(
    (m): m is PBRMaterial => m instanceof PBRMaterial
  );
  container.animationGroups.forEach(group => group.play(true));

  const {
    at,
    to,
    duration,
    scale = 1,
    endScale = scale,
    spin = 0,
    yaw = 0,
    faceMovement = false,
    fadeOut = 0.3,
    rise = 0,
  } = options;

  node.position.copyFrom(at);
  node.rotation.y = yaw;
  if (faceMovement && to) {
    node.rotation.y = Math.atan2(to.x - at.x, to.z - at.z);
  }

  let time = 0;
  let alpha = 1;
  const observer = scene.onBeforeRenderObservable.add(() => {
    // loading the model stalls a frame: a big delta would end the effect
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, MAX_FRAME_TIME);
    time += dt;
    const t = Math.min(1, time / duration);

    if (to) Vector3.LerpToRef(at, to, t, node.position);
    else node.position.copyFrom(at);
    node.position.y += rise * t;

    node.scaling.setAll(scale + (endScale - scale) * t);
    node.rotation.y += spin * dt;

    const fadeStart = 1 - fadeOut;
    const newAlpha = t < fadeStart || fadeOut <= 0 ? 1 : 1 - (t - fadeStart) / fadeOut;
    if (Math.abs(newAlpha - alpha) > 0.02) {
      alpha = newAlpha;
      for (const material of materials) material.alpha = alpha;
    }

    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      container.dispose();
      node.dispose();
    }
  });
}

// downloads the models before they are used (the first cast would be late)
export function preloadEffects(names: string[]) {
  names.forEach(name => loadFile(name));
}
