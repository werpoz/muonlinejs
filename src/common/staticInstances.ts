import {
  Matrix,
  Mesh,
  Quaternion,
  Vector3,
  VertexBuffer,
  type AbstractMesh,
  type AnimationGroup,
  type Skeleton,
} from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { loadGLTF } from './modelLoader';

// Instancing of the static objects of the maps (fences, walls, barrels,
// grass...): each model is loaded once, its skeleton pose is baked into the
// vertices and every object is an instance of those meshes (one draw call
// for all of them, no skeleton nor animations per object). The animated
// models (candles, signs, the water spout...) aren't instanced.

type Source = {
  root: AbstractMesh;
  // the meshes and their transform relative to the root of the model
  meshes: { mesh: Mesh; matrix: Matrix }[];
};

const sources = new Map<string, Promise<Source | null>>();

// static: no animation, or animations of one frame
const isStatic = (groups: AnimationGroup[]) => groups.every(g => g.to - g.from <= 1);

async function createSource(path: string, world: World): Promise<Source | null> {
  const gltf = await loadGLTF(path, world);
  const root = gltf.mesh;
  if (!isStatic(gltf.animationGroups)) {
    // loaded for nothing: the objects load their own copy
    root.dispose(false, false);
    gltf.skeleton?.dispose();
    gltf.animationGroups.forEach(g => g.dispose());
    return null;
  }

  // the pose the objects have: the (only) frame of their first animation,
  // that the glTF loader plays, else the rest pose of the nodes
  const group = gltf.animationGroups[0];
  if (group) {
    group.start(false, 1, group.from, group.from);
    group.goToFrame(group.from);
    group.pause();
  }
  root.position.setAll(0);
  root.computeWorldMatrix(true);
  root.getDescendants(false).forEach(node => node.computeWorldMatrix(true));
  const rootInverse = Matrix.Invert(root.getWorldMatrix());

  const meshes: Source['meshes'] = [];
  for (const mesh of root.getChildMeshes(false)) {
    if (!(mesh instanceof Mesh) || !mesh.getTotalVertices()) continue;
    const skeleton = mesh.skeleton as Skeleton | null;
    if (skeleton) {
      skeleton.prepare(true);
      mesh.applySkeleton(skeleton);
      mesh.skeleton = null;
      mesh.removeVerticesData(VertexBuffer.MatricesIndicesKind);
      mesh.removeVerticesData(VertexBuffer.MatricesWeightsKind);
    }
    mesh.alwaysSelectAsActiveMesh = false;
    mesh.refreshBoundingInfo();
    meshes.push({ mesh, matrix: mesh.getWorldMatrix().multiply(rootInverse) });
  }

  gltf.animationGroups.forEach(g => g.dispose());
  gltf.skeleton?.dispose();
  // the source meshes are never drawn, only their instances
  meshes.forEach(({ mesh }) => {
    mesh.setParent(null);
    mesh.position.set(0, -100000, 0);
    mesh.isPickable = false;
  });
  root.getChildTransformNodes(false).forEach(node => node.dispose());

  return { root, meshes };
}

// The model as instances of shared meshes, or null when the model is
// animated (then it must be loaded with loadGLTF).
export async function loadGLTFInstance(path: string, world: World) {
  let source = sources.get(path);
  if (!source) {
    source = createSource(path, world);
    sources.set(path, source);
  }
  const src = await source;
  if (!src) return null;

  const root = new Mesh(`${path.split('/').at(-1)}_instance`, world.scene);
  root.metadata = { instanceRoot: true };
  const scaling = new Vector3();
  const rotation = new Quaternion();
  const position = new Vector3();
  for (const { mesh, matrix } of src.meshes) {
    const instance = mesh.createInstance(mesh.name);
    instance.parent = root;
    matrix.decompose(scaling, rotation, position);
    instance.scaling.copyFrom(scaling);
    instance.rotationQuaternion = rotation.clone();
    instance.position.copyFrom(position);
    instance.isPickable = false;
  }

  return {
    mesh: root as AbstractMesh,
    skeleton: null as unknown as Skeleton,
    animationGroups: [] as AnimationGroup[],
  };
}

// the models of another map are not needed anymore
export function clearStaticInstances() {
  for (const source of sources.values()) {
    source.then(src => src?.meshes.forEach(({ mesh }) => mesh.dispose(false, false)));
  }
  sources.clear();
}
