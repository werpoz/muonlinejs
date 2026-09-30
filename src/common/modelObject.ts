import { worldFolderNumber } from './worldFolder';
import {
  Matrix,
  Quaternion,
  Vector3,
  BoundingBox,
  Mesh,
  type StandardMaterial,
  TransformNode,
  type Scene,
  AbstractMesh,
  Skeleton,
  AnimationGroup,
  CreateBox,
  type InstancedMesh,
  type Material,
} from '../libs/babylon/exports';
import type { IVector3Like, Plane } from '../libs/babylon/exports';
// import { createMeshesForBMD } from './BMD/createMeshes';
import type { Entity, World } from '../ecs/world';
import { ENUM_WORLD } from './types';
import { loadGLTF } from './modelLoader';
import { loadGLTFInstance } from './staticInstances';
import { Store } from '../store';

const BoundingUpdateInterval = 5;

type Int = number;

const EmptyBone = Matrix.Identity();
const EmptyMatrix = Matrix.Identity();
const tmpMatrix = Matrix.Identity();
const tmpQ = Quaternion.Identity();
const tmpVec3 = Vector3.Zero();
const tmpVec32 = Vector3.Zero();

const minTmp = new Vector3(Number.MAX_VALUE);
const maxTmp = new Vector3(Number.MIN_VALUE);

const cullCenterTmp = new Vector3();

// the mesh drawn for a mesh of a model: the shared one of an instance
const sharedMeshOf = (mesh: AbstractMesh) =>
  mesh.getClassName() === 'InstancedMesh' ? (mesh as InstancedMesh).sourceMesh : mesh;

// seconds between two measures of the skinned bounds of a model
const BOUNDS_MAX_AGE = 0.5;

export class ModelObject {
  static OverrideScale = -1;

  Type: number = -1;
  WorldIndex: ENUM_WORLD = ENUM_WORLD.WD_0LORENCIA;

  HiddenMesh = -1;
  BlendMesh = -1;
  // BlendMeshState  = BlendState.Additive;
  AnimationSpeed = 4;
  BodyHeight: Float = 0;
  CurrentAction: Int = 0;
  LoopAction = true;
  LinkParent = false;
  ActionIterationWasFinished = false;
  Ready = false;
  OutOfView = false;
  Visible = true;
  Parent?: ModelObject;
  Children: ModelObject[] = [];

  SkipBoundingBox = false;

  BoundingBoxLocal = new BoundingBox(Vector3.Zero(), Vector3.Zero());

  Light = new Vector3(0, 0, 0);

  ParentBoneLink = -1;
  protected _node: TransformNode;
  gltf: {
    mesh: AbstractMesh;
    skeleton: Skeleton;
    animationGroups: AnimationGroup[];
  } | null = null;

  NodeNamePrefix = '';

  get objectDir() {
    return `Object${worldFolderNumber(this.WorldIndex)}/`;
  }

  constructor(
    private readonly scene: Scene,
    private readonly parent?: TransformNode
  ) {
    this._node = new TransformNode('modelObject', this.scene);
    this._node.rotationQuaternion = null;

    if (parent) {
      this._node.setParent(parent);
    }
  }

  init(_world: World, _entity: Entity): Promise<void> {
    return Promise.resolve();
  }

  playAction(actionIndex: number, loop: boolean = true) {
    if (!this.gltf) return;

    const prevAction = this.CurrentAction;
    if (prevAction === actionIndex) return;

    if (prevAction !== -1) {
      const prevAnimationGroup = this.gltf.animationGroups[prevAction];
      if (prevAnimationGroup) {
        prevAnimationGroup.stop();
      }
    }

    this.CurrentAction = actionIndex;

    const animationGroup = this.gltf.animationGroups[actionIndex];
    if (animationGroup) {
      animationGroup.speedRatio = this.AnimationSpeed / 14;
      animationGroup.play(loop);
    }
  }

  load(gltf: {
    mesh: AbstractMesh;
    skeleton: Skeleton;
    animationGroups: AnimationGroup[];
  }) {
    if (this.gltf === gltf) return;

    const oldGltf = this.gltf;
    this.gltf = gltf;
    this._node.name = this.NodeNamePrefix + gltf.mesh.name;

    if (oldGltf && oldGltf !== gltf) {
      console.log('dispose', oldGltf.mesh.name);
      oldGltf.mesh.dispose();
    }
    // console.log('load', gltf.mesh.name);

    gltf.mesh.setParent(this._node);
    gltf.mesh.position.setAll(0);
    gltf.mesh.scaling.set(1, -1, 1);
    gltf.mesh.rotationQuaternion = Quaternion.FromEulerAngles(
      -Math.PI / 2,
      0,
      0
    );

    if (this.LinkParent) {
      const parent = this.Parent;
      if (parent) {
        const parentSkeleton = parent.gltf?.skeleton;
        if (parentSkeleton) {
          this.gltf.mesh.getChildMeshes(true).forEach(mesh => {
            mesh.skeleton?.dispose();
            mesh.skeleton = parentSkeleton;
          });
        }
      }
    }

    // if (this.ParentBoneLink >= 0) {
    //   const parent = this.Parent;
    //   if (parent && parent.gltf?.skeleton) {
    //     const bone = parent.gltf.skeleton.bones[this.ParentBoneLink + 1];
    //     console.log(bone);
    //     // this._node.attachToBone(bone, bone.getTransformNode()!);
    //   }
    // }

    gltf.animationGroups.forEach(group => {
      group.speedRatio = this.AnimationSpeed / 14;
    });

    gltf.mesh.getChildMeshes(false).forEach(mesh => {
      mesh.metadata ??= {};
      mesh.metadata.SkipBoundingBox = this.SkipBoundingBox;
    });

    this.Ready = true;
  }

  setParent(parent: ModelObject): void {
    if (this.Parent) {
      // Remove from previous parent's children
      const index = this.Parent.Children.indexOf(this);
      if (index !== -1) {
        this.Parent.Children.splice(index, 1);
      }
    }

    this.Parent = parent;
    parent.Children.push(this);
  }

  getMesh(ind: number) {
    return this.gltf?.mesh.getChildMeshes(false)[ind];
  }

  getMaterial(ind: number) {
    return this.getMesh(ind)!.material as StandardMaterial;
  }

  getMeshes(recursiveWithChildren = false): Mesh[] {
    if (!this.gltf) return [];

    return this.gltf.mesh.getChildMeshes(!recursiveWithChildren);
  }

  setActionSpeed(actionType: number, speed: number) {
    // const action = this.Model?.Actions?.[actionType];
    // if (action) {
    //   action.PlaySpeed = speed;
    // }
  }

  Update(gameTime: World['gameTime']): void {
    if (!this.Ready || this.OutOfView) return;

    this.ActionIterationWasFinished = false;

    if (this.ParentBoneLink >= 0) {
      const parent = this.Parent;
      if (parent && parent.gltf?.skeleton) {
        const bone = parent.gltf.skeleton.bones[this.ParentBoneLink + 1];
        const node = bone.getTransformNode();
        if (node && this._node.parent !== node) {
          this._node.setParent(node);
          this._node.position.setAll(0);
          this._node.rotationQuaternion = Quaternion.FromEulerAngles(
            Math.PI * 1.5,
            0,
            0
          );

          // const b = CreateBox('abc', { size: 0.1 }, this.scene);
          // b.setParent(node);
          // b.position.setAll(0);
          // b.scaling.setAll(1);
          // b.rotationQuaternion = Quaternion.Identity();
        }
      }
    }
  }

  Draw(_gameTime: World['gameTime']): void {
    if (!this.Visible) return;

    this.getMeshes().forEach((_, i) => {
      this.DrawMesh(i);
    });
  }

  DrawMesh(mesh: Int): void {
    if (this.HiddenMesh === mesh) return;
  }

  // the skinned bounds relative to the node, and when they were measured
  private readonly boundsMin = new Vector3();
  private readonly boundsMax = new Vector3();
  private boundsTime = -Infinity;

  // Sphere around the model for the culling of the camera: the center
  // relative to the node and the radius, measured once with the skeleton
  private cullRadius = -1;
  private readonly cullCenter = new Vector3();

  // false when the model is out of the view of the camera
  isInFrustum(planes: Plane[]): boolean {
    if (!this.gltf) return true;
    if (this.cullRadius < 0) {
      this.UpdateBoundings(Infinity);
      this.boundsMin.addToRef(this.boundsMax, this.cullCenter).scaleInPlace(0.5);
      // some margin for the animations
      this.cullRadius = Math.max(2, Vector3.Distance(this.boundsMin, this.boundsMax) * 0.5 + 1);
    }
    const center = this._node.getAbsolutePosition().addToRef(this.cullCenter, cullCenterTmp);
    for (const plane of planes) {
      if (plane.dotCoordinate(center) < -this.cullRadius) return false;
    }
    return true;
  }

  // shows or hides the whole model (its meshes, bones and children); its
  // animation stops while it is hidden
  setEnabled(enabled: boolean) {
    if (this._node.isEnabled(false) === enabled) return;
    this._node.setEnabled(enabled);
    this.pauseAnimation(!enabled);
  }

  private pauseAnimation(paused: boolean) {
    const group = this.gltf?.animationGroups[this.CurrentAction];
    if (group) {
      if (paused && group.isPlaying) group.pause();
      else if (!paused && !group.isPlaying && group.isStarted) group.play(this.LoopAction);
    }
    for (const child of this.Children) child.pauseAnimation(paused);
  }

  // Bounds of the model in the world (BoundingBoxLocal.minimumWorld /
  // maximumWorld). Measuring them applies the skeleton to the vertices on
  // the CPU, so their shape is measured again only after maxAge seconds;
  // in between they follow the position of the model.
  UpdateBoundings(maxAge = BOUNDS_MAX_AGE) {
    if (!this.gltf) return;

    const position = this._node.getAbsolutePosition();
    const now = performance.now() / 1000;
    if (this.boundsTime === -Infinity || now - this.boundsTime > maxAge) {
      this._node.getChildMeshes(false).forEach(mesh => {
        mesh.refreshBoundingInfo(true, false);
      });

      const boundingBox = this._node.getHierarchyBoundingVectors(true, m => {
        return !m.metadata?.SkipBoundingBox;
      });
      if (boundingBox.min.x <= boundingBox.max.x) {
        boundingBox.min.subtractToRef(position, this.boundsMin);
        boundingBox.max.subtractToRef(position, this.boundsMax);
      } else {
        // no mesh counts for the bounds (e.g. NPCs made of body parts that
        // skip them): the size of a character
        this.boundsMin.set(-0.4, 0, -0.4);
        this.boundsMax.set(0.4, 1.8, 0.4);
      }
      // spread the measures of the models over time
      this.boundsTime = now + Math.random() * maxAge * 0.5;
    }

    position.addToRef(this.boundsMin, this.BoundingBoxLocal.minimumWorld);
    position.addToRef(this.boundsMax, this.BoundingBoxLocal.maximumWorld);
  }

  updateLocation(pos: IVector3Like, scale: Float, angles: IVector3Like) {
    this._node.position.set(pos.x, pos.y, pos.z);

    this._node.rotation.x = angles.x;
    this._node.rotation.y = angles.y;
    this._node.rotation.z = angles.z;

    this._node.scaling.setAll(scale);
  }

  // transparency of the model and its children (weapons...), 1 = opaque
  setAlpha(alpha: number) {
    const mesh = this.gltf?.mesh;
    if (mesh) {
      for (const m of [mesh, ...mesh.getChildMeshes(false)]) m.visibility = alpha;
    }
    for (const child of this.Children) child.setAlpha(alpha);
  }

  Unload() {
    // remove the model (e.g. an unequipped weapon), the node stays for reuse
    if (this.gltf) {
      this.gltf.mesh.dispose();
      this.gltf = null;
    }
    this.Ready = false;
  }

  dispose(): void {
    this._node.dispose();
    if (this.gltf) {
      // the instances share their meshes and materials
      this.gltf.mesh.dispose(false, !this.gltf.mesh.metadata?.instanceRoot);
      this.gltf.skeleton?.dispose();
      this.gltf.animationGroups.forEach(group => {
        group.dispose();
      });
      this.gltf = null;
    }

    this.Ready = false;

    for (const child of this.Children) {
      child.dispose();
    }

    this.Children.length = 0;
  }

  // map objects that change the material or the alpha of their meshes
  // per object can't share them: they set this to false
  protected allowInstancing = true;

  // The material of a mesh of the model: on the shared mesh when the model
  // is an instance (the same for all the objects of that model).
  protected setMeshMaterial(index: number, material: Material) {
    const mesh = this.getMesh(index);
    if (!mesh) return;
    const target = sharedMeshOf(mesh);
    target.material = material;
  }

  // the alpha of a mesh (shared by all the instances of the model)
  protected setMeshAlpha(index: number, alpha: number) {
    const mesh = this.getMesh(index);
    if (!mesh) return;
    const target = sharedMeshOf(mesh);
    target.visibility = alpha;
  }

  protected async loadSpecificModel(modelName: string) {
    this.load(await this.loadModel(`${this.objectDir}${modelName}`));
  }

  // an instance of the shared meshes of a static model, or its own copy
  protected async loadModel(path: string) {
    const world = Store.world!;
    return (this.allowInstancing && (await loadGLTFInstance(path, world))) || loadGLTF(path, world);
  }

  protected async loadSpecificModelWithDynamicID(
    modelId: number,
    namePrefix: string
  ) {
    const idx = (this.Type - modelId + 1).toString().padStart(2, '0');
    const name = `${namePrefix}${idx}.glb`;
    await this.loadSpecificModel(name);
  }
}
