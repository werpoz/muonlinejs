import {
  BoundingBox,
  Vector3,
  type Scene,
  type TransformNode,
} from '../libs/babylon/exports';
import { ModelObject } from './modelObject';
import { PlayerClass } from './types';
import { Entity, World } from '../ecs/world';
import { PlayerAction } from './objects/enum';
import { loadGLTF } from './modelLoader';
import { Store } from '../store';
import type { MountKind } from './mounts';

export class PlayerObject extends ModelObject {
  playerClass: PlayerClass = PlayerClass.DarkKnight;

  readonly HelmMask: ModelObject;
  readonly Helm: ModelObject;
  readonly Armor: ModelObject;
  readonly Pants: ModelObject;
  readonly Gloves: ModelObject;
  readonly Boots: ModelObject;
  readonly Weapon1: ModelObject;
  readonly Weapon2: ModelObject;
  readonly Wings: ModelObject;
  // Uniria, Dinorant, Dark Horse or Fenrir under the player
  readonly Mount: ModelObject;
  // Guardian Angel, Satan or Dark Raven flying next to the player
  readonly FlyingPet: ModelObject;
  mountKind: MountKind | null = null;
  // models loaded in the sockets above (to load them only when they change)
  private readonly loadedModels = new Map<ModelObject, string>();

  IsInteractable = false;

  constructor(scene: Scene, parent: TransformNode) {
    super(scene, parent);

    this.BoundingBoxLocal = new BoundingBox(
      new Vector3(-0.4, 0, -0.4),
      new Vector3(0.4, 1.2, 0.4)
    );

    this.CurrentAction = PlayerAction.PLAYER_SKILL_INFERNO;

    this.HelmMask = new ModelObject(scene, this._node);
    this.Helm = new ModelObject(scene, this._node);
    this.Armor = new ModelObject(scene, this._node);
    this.Pants = new ModelObject(scene, this._node);
    this.Gloves = new ModelObject(scene, this._node);
    this.Boots = new ModelObject(scene, this._node);
    this.Weapon1 = new ModelObject(scene, this._node);
    this.Weapon2 = new ModelObject(scene, this._node);
    this.Wings = new ModelObject(scene, this._node);
    this.Mount = new ModelObject(scene, this._node);
    this.FlyingPet = new ModelObject(scene, this._node);

    this.HelmMask.NodeNamePrefix = 'HelmMask_';
    this.Helm.NodeNamePrefix = 'Helm_';
    this.Armor.NodeNamePrefix = 'Armor_';
    this.Pants.NodeNamePrefix = 'Pants_';
    this.Gloves.NodeNamePrefix = 'Gloves_';
    this.Boots.NodeNamePrefix = 'Boots_';
    this.Weapon1.NodeNamePrefix = 'Weapon1_';
    this.Weapon2.NodeNamePrefix = 'Weapon2_';
    this.Wings.NodeNamePrefix = 'Wings_';
    this.Mount.NodeNamePrefix = 'Mount_';
    this.FlyingPet.NodeNamePrefix = 'FlyingPet_';

    const objs = [
      this.HelmMask,
      this.Helm,
      this.Armor,
      this.Pants,
      this.Gloves,
      this.Boots,
      this.Weapon1,
      this.Weapon2,
      this.Wings,
      this.Mount,
      this.FlyingPet,
    ];

    objs.forEach(obj => {
      obj.setParent(this);
      obj.LinkParent = true;
    });

    this.Wings.LinkParent = false;
    this.Wings.ParentBoneLink = 47;
    this.Wings.SkipBoundingBox = true;
    this.Mount.LinkParent = false;
    this.Mount.SkipBoundingBox = true;
    this.Mount.AnimationSpeed = 5;
    this.FlyingPet.LinkParent = false;
    this.FlyingPet.SkipBoundingBox = true;
    // next to the right shoulder, a bit behind
    this.FlyingPet.updateLocation({ x: -0.7, y: 1.9, z: -0.4 }, 1, { x: 0, y: 0, z: 0 });
    this.Weapon1.SkipBoundingBox = true;
    this.Weapon2.SkipBoundingBox = true;
    this.HelmMask.SkipBoundingBox = true;
    this.Pants.SkipBoundingBox = true;
    this.Gloves.SkipBoundingBox = true;
    this.Helm.SkipBoundingBox = true;

    // 37 - l hand(0>2>17>18>19>34>35>36)
    // 42 -l hand slot

    // 28 - r hand
    // 33 - r kine
    this.Weapon1.LinkParent = false;
    this.Weapon1.ParentBoneLink = 33;
    // this.Weapon2.ParentBoneLink = 36;//28;//42;
  }

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF('Player/player.glb', world));
    this.Ready = false;
    await this.updateBodyPartClassesAsync();

    this.setActionSpeed(PlayerAction.PLAYER_WALK_MALE, 2);
    this.setActionSpeed(PlayerAction.PLAYER_WALK_FEMALE, 2);

    this.Ready = true;
  }

  async updateBodyPartClassesAsync() {
    await this.setBodyPartsAsync(
      'Player/',
      'HelmClass',
      'ArmorClass',
      'PantClass',
      'GloveClass',
      'BootClass',
      this.playerClass
    );

    // await this.loadPartAsync('Item/', this.Wings, `Wing04.glb`);
    // const wingMat = this.Wings.getMaterial(0);
    // if (wingMat) {
    //   wingMat.alpha = 0.99;
    //   wingMat.alphaMode = 1;
    //   wingMat.transparencyMode = 2;
    //   wingMat.backFaceCulling = false;
    // }
  }

  // Loads a model in a socket (wings, mount, pet), or removes it (null); its
  // first action (the wings flapping, the pet flying) plays in a loop.
  private async setSocketModel(socket: ModelObject, path: string | null) {
    if ((this.loadedModels.get(socket) ?? null) === path) return;
    if (path === null) {
      this.loadedModels.delete(socket);
      socket.Unload();
      return;
    }
    this.loadedModels.set(socket, path);
    const gltf = await loadGLTF(path, Store.world!);
    // another model was asked while this one was loading
    if (this.loadedModels.get(socket) !== path) {
      gltf.mesh.dispose();
      return;
    }
    socket.load(gltf);
    socket.CurrentAction = -1;
    socket.playAction(0, true);
    socket.getMeshes(true).forEach(mesh => {
      mesh.isPickable = false;
      if (mesh.material) mesh.material.backFaceCulling = false;
    });
  }

  setWingsModel(path: string | null) {
    return this.setSocketModel(this.Wings, path);
  }

  async setMountModel(kind: MountKind | null, path: string | null) {
    this.mountKind = kind;
    await this.setSocketModel(this.Mount, path);
  }

  async setFlyingPetModel(path: string | null, scale = 1) {
    await this.setSocketModel(this.FlyingPet, path);
    this.FlyingPet.updateLocation({ x: -0.7, y: 1.9, z: -0.4 }, scale, { x: 0, y: 0, z: 0 });
  }

  async setDefaultHelm() {
    await this.setBodyPartsAsync(
      'Player/',
      'HelmClass',
      '',
      '',
      '',
      '',
      this.playerClass
    );
  }

  async setDefaultMask() {
    this.HelmMask.Unload();
  }

  async setDefaultArmor() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      'ArmorClass',
      '',
      '',
      '',
      this.playerClass
    );
  }

  async setDefaultPants() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      '',
      'PantClass',
      '',
      '',
      this.playerClass
    );
  }

  async setDefaultGloves() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      '',
      '',
      'GloveClass',
      '',
      this.playerClass
    );
  }

  async setDefaultBoots() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      '',
      '',
      '',
      'BootClass',
      this.playerClass
    );
  }

  async setBodyPartsAsync(
    pathPrefix: string,
    helmPrefix: string,
    armorPrefix: string,
    pantPrefix: string,
    glovePrefix: string,
    bootPrefix: string,
    skinIndex: number
  ) {
    // Format skin index to two digits (e.g., 1 -> "01", 10 -> "10")
    const fileSuffix = skinIndex.toString().padStart(2, '0');

    await Promise.all([
      !helmPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Helm,
            `${helmPrefix}${fileSuffix}.glb`
          ),
      !armorPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Armor,
            `${armorPrefix}${fileSuffix}.glb`
          ),
      !pantPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Pants,
            `${pantPrefix}${fileSuffix}.glb`
          ),
      !glovePrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Gloves,
            `${glovePrefix}${fileSuffix}.glb`
          ),
      !bootPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Boots,
            `${bootPrefix}${fileSuffix}.glb`
          ),
    ]);
  }

  async loadPartAsync(
    dir: string,
    part: ModelObject,
    modelPath: string,
    itemLvl?: number,
    isExcellent?: boolean
  ) {
    const gltf = await loadGLTF(dir + modelPath, Store.world!);
    part.load(gltf);

    gltf.mesh.isPickable = this.IsInteractable;
    const meshes = part.getMeshes(true);

    meshes.forEach(mesh => {
      mesh.isPickable = this.IsInteractable;
      mesh.metadata ??= {};
      mesh.metadata.itemLvl = itemLvl ?? 0;
      mesh.metadata.isExcellent = isExcellent ?? false;
    });
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    // Update all children
    for (const child of this.Children) {
      child.Update(gameTime);
    }
  }

  Draw(gameTime: World['gameTime']): void {
    super.Draw(gameTime);

    // Update all children
    for (const child of this.Children) {
      child.Draw(gameTime);
    }
  }
}
